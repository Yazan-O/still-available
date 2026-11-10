import { fail } from "@agent-native/core/action";
import { and, asc, desc, eq, inArray, lte, min } from "drizzle-orm";

import { MAX_OFFERS, type BuyerOffer, type BuyerVerdict } from "../../shared/buyer.js";
import { getDb } from "../db/index.js";
import { listingGuardrails, listings, messages, offers, threads } from "../db/schema.js";
import {
  type Actor,
  type Exec,
  type SellerActor,
  assertOwner,
  logEvent,
  money,
  notifySeller,
  nowIso,
  first,
  requireSeller,
  uid,
} from "./common.js";

export type Tone = "friendly" | "dry" | "cheerful";
export type Guardrails = typeof listingGuardrails.$inferSelect;
type ThreadRow = typeof threads.$inferSelect;
type OfferRow = typeof offers.$inferSelect;

export type Judgement =
  | { outcome: "refused"; reason: "descending" | "over_cap" }
  | {
      outcome: "deal" | "countered" | "passed";
      counterAmount: number | null;
      aboveFloor: boolean;
      offersUsedAfter: number;
    };

export function counterFor(ask: number, robotLimit: number, steps: number, offersUsedAfter: number) {
  const step = Math.ceil((ask - robotLimit) / steps);
  return Math.max(robotLimit, ask - step * offersUsedAfter);
}

export function judgeOffer(input: {
  ask: number;
  robotLimit: number;
  floor: number;
  steps: number;
  offersUsed: number;
  highestOffer: number | null;
  amount: number;
}): Judgement {
  if (input.offersUsed >= MAX_OFFERS) return { outcome: "refused", reason: "over_cap" };
  if (input.highestOffer !== null && input.amount <= input.highestOffer) {
    return { outcome: "refused", reason: "descending" };
  }
  const offersUsedAfter = input.offersUsed + 1;
  const counter = counterFor(input.ask, input.robotLimit, input.steps, offersUsedAfter);
  const aboveFloor = input.amount >= input.floor;
  if (input.amount >= counter) return { outcome: "deal", counterAmount: null, aboveFloor, offersUsedAfter };
  if (offersUsedAfter < MAX_OFFERS) {
    return { outcome: "countered", counterAmount: counter, aboveFloor, offersUsedAfter };
  }
  return { outcome: "passed", counterAmount: null, aboveFloor, offersUsedAfter };
}

export const OWNER_LINE = "The owner is in this chat now; they will answer your offer.";
export const neutralLine = (amount: number, current: number) =>
  `No answer from the seller on ${money(amount)} yet. The current price is ${money(current)}.`;

export function toBuyerVerdict(j: Judgement, amount: number): BuyerVerdict {
  if (j.outcome === "refused") return { verdict: "refused", reason: j.reason };
  if (j.outcome === "deal") return { verdict: "deal", amount };
  if (j.outcome === "countered") return { verdict: "countered", counterAmount: j.counterAmount as number };
  return { verdict: "passed" };
}

export function toBuyerOffer(row: OfferRow): BuyerOffer {
  return {
    amount: row.amount,
    outcome: row.outcome,
    counterAmount: row.outcome === "countered" ? row.counterAmount : null,
    createdAt: row.createdAt,
  };
}

function reviewDelayMs(fast: boolean, rand: () => number) {
  const [min, max] = fast ? [30_000, 90_000] : [120_000, 600_000];
  return Math.round(min + rand() * (max - min));
}

async function guardrailsFor(db: Exec, listingId: string): Promise<Guardrails> {
  const [row] = await db.select().from(listingGuardrails).where(eq(listingGuardrails.listingId, listingId));
  if (!row) fail("This listing has no guardrails yet.", { errorCode: "guardrails_missing", statusCode: 409 });
  return row;
}

async function lockThread(db: Exec, threadId: string) {
  const [row] = await db.select().from(threads).where(eq(threads.id, threadId)).for("update");
  if (!row) fail("That conversation was not found.", { errorCode: "not_found", statusCode: 404 });
  return row;
}

async function listingOf(db: Exec, listingId: string) {
  const [row] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!row) fail("That listing was not found.", { errorCode: "not_found", statusCode: 404 });
  return row;
}

const scopeOf = (t: ThreadRow) => ({ listingId: t.listingId, threadId: t.id, ownerEmail: t.ownerEmail, orgId: t.orgId });

function dealStatus(g: Guardrails) {
  return g.autoClose ? ("deal" as const) : ("deal_pending" as const);
}

export async function ensureDefaultGuardrails(db: Exec, listing: { id: string; ownerEmail: string; orgId: string | null; askPrice: number }) {
  await db
    .insert(listingGuardrails)
    .values({
      listingId: listing.id,
      ownerEmail: listing.ownerEmail,
      orgId: listing.orgId,
      floorPrice: listing.askPrice,
      robotLimitPrice: listing.askPrice,
      updatedAt: nowIso(),
    })
    .onConflictDoNothing();
}

export async function assertAskFitsGuardrails(db: Exec, listingId: string, ask: number) {
  const [row] = await db.select().from(listingGuardrails).where(eq(listingGuardrails.listingId, listingId));
  if (row && row.robotLimitPrice > ask) {
    fail(`The asking price must stay at or above the robot limit (${money(row.robotLimitPrice)}).`, {
      errorCode: "ask_below_robot_limit",
      statusCode: 409,
    });
  }
}

export async function robotTone(listingId: string): Promise<Tone> {
  const [row] = await getDb()
    .select({ tone: listingGuardrails.tone })
    .from(listingGuardrails)
    .where(eq(listingGuardrails.listingId, listingId));
  return row?.tone ?? "friendly";
}

export async function releasedPickupDetails(thread: Pick<ThreadRow, "listingId" | "pickupReleased">) {
  if (!thread.pickupReleased) return null;
  const [row] = await getDb()
    .select({ pickupDetails: listingGuardrails.pickupDetails })
    .from(listingGuardrails)
    .where(eq(listingGuardrails.listingId, thread.listingId));
  return row?.pickupDetails ?? "";
}

export const FLOOR_CHECK = "exact number in robot and system messages";

export async function floorAppearsIn(listingId: string, texts: string[], visible: number[] = []) {
  const g = await guardrailsFor(getDb(), listingId);
  if (visible.includes(g.floorPrice)) return false;
  const pattern = new RegExp(`(?<![\\w.,])${g.floorPrice}(?!\\w|[.,]\\d)`);
  return texts.some((t) => pattern.test(t.replace(/(\d),(\d{3})/g, "$1$2")));
}

export async function floorLeakIn(threadId: string) {
  const db = getDb();
  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId));
  if (!thread) fail("That conversation was not found.", { errorCode: "not_found", statusCode: 404 });
  const listing = await listingOf(db, thread.listingId);
  const [offerRows, said] = await Promise.all([
    db.select().from(offers).where(eq(offers.threadId, threadId)),
    db
      .select({ text: messages.text })
      .from(messages)
      .where(and(eq(messages.threadId, threadId), inArray(messages.role, ["agent", "system"]))),
  ]);
  const visible = [listing.askPrice, ...offerRows.map((o) => o.amount)];
  for (const o of offerRows) if (o.outcome === "countered" && o.counterAmount !== null) visible.push(o.counterAmount);
  if (thread.agreedPrice !== null) visible.push(thread.agreedPrice);
  return floorAppearsIn(thread.listingId, said.map((m) => m.text), visible);
}

function toSellerGuardrails(g: Guardrails) {
  return {
    listingId: g.listingId,
    floorPrice: g.floorPrice,
    robotLimitPrice: g.robotLimitPrice,
    counterSteps: g.counterSteps,
    autoClose: g.autoClose,
    pickupDetails: g.pickupDetails,
    tone: g.tone,
    updatedAt: g.updatedAt,
  };
}

export async function getGuardrails(input: { listingId: string }, actor: Actor) {
  const seller = requireSeller(actor);
  const db = getDb();
  assertOwner(await listingOf(db, input.listingId), seller, "listing");
  return toSellerGuardrails(await guardrailsFor(db, input.listingId));
}

export type GuardrailsPatch = {
  listingId: string;
  floorPrice?: number | undefined;
  robotLimitPrice?: number | undefined;
  counterSteps?: number | undefined;
  autoClose?: boolean | undefined;
  pickupDetails?: string | undefined;
  tone?: Tone | undefined;
};

export async function setGuardrails(input: GuardrailsPatch, actor: Actor) {
  const seller = requireSeller(actor);
  const saved = await getDb().transaction(async (tx) => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, input.listingId)).for("update");
    assertOwner(listing, seller, "listing");
    const [current] = await tx.select().from(listingGuardrails).where(eq(listingGuardrails.listingId, listing.id));
    const next = {
      floorPrice: input.floorPrice ?? current?.floorPrice ?? listing.askPrice,
      robotLimitPrice: input.robotLimitPrice ?? current?.robotLimitPrice ?? listing.askPrice,
      counterSteps: input.counterSteps ?? current?.counterSteps ?? 3,
      autoClose: input.autoClose ?? current?.autoClose ?? false,
      pickupDetails: input.pickupDetails ?? current?.pickupDetails ?? "",
      tone: input.tone ?? current?.tone ?? ("friendly" as Tone),
    };
    if (!(next.floorPrice <= next.robotLimitPrice && next.robotLimitPrice <= listing.askPrice)) {
      fail(
        `Prices must satisfy floor <= robot limit <= ask (${money(next.floorPrice)}, ${money(next.robotLimitPrice)}, ${money(listing.askPrice)}).`,
        { errorCode: "invalid_price_order", statusCode: 409 },
      );
    }
    const values = { ...next, updatedAt: nowIso() };
    const row = first(await tx
      .insert(listingGuardrails)
      .values({ listingId: listing.id, ownerEmail: listing.ownerEmail, orgId: listing.orgId, ...values })
      .onConflictDoUpdate({ target: listingGuardrails.listingId, set: values })
      .returning());
    return row;
  });
  notifySeller(saved);
  return toSellerGuardrails(saved);
}

export async function submitOffer(
  input: { threadId: string; amount: number },
  actor: Actor,
  rand: () => number = Math.random,
  clock: () => Date = () => new Date(),
): Promise<BuyerVerdict> {
  if (actor.kind === "seller") fail("Offers come from the buyer side.", { errorCode: "forbidden", statusCode: 403 });
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    fail("An offer must be a whole positive amount.", { errorCode: "invalid_amount", statusCode: 400 });
  }
  const result = await getDb().transaction(async (tx) => {
    const thread = await lockThread(tx, input.threadId);
    if (thread.status !== "open") {
      fail("This conversation is no longer taking offers.", { errorCode: "thread_not_open", statusCode: 409 });
    }
    const listing = await listingOf(tx, thread.listingId);
    const g = await guardrailsFor(tx, thread.listingId);
    const judgement = judgeOffer({
      ask: listing.askPrice,
      robotLimit: g.robotLimitPrice,
      floor: g.floorPrice,
      steps: g.counterSteps,
      offersUsed: thread.offersUsed,
      highestOffer: thread.highestOffer,
      amount: input.amount,
    });
    const at = clock();
    const createdAt = at.toISOString();
    const scope = scopeOf(thread);
    if (judgement.outcome === "refused") {
      await tx.insert(offers).values({
        id: uid(),
        threadId: thread.id,
        ownerEmail: thread.ownerEmail,
        orgId: thread.orgId,
        amount: input.amount,
        outcome: "refused",
        createdAt,
      });
      await logEvent(tx, scope, actor.kind, "blocked_attempt", { reason: judgement.reason, amount: input.amount });
      return { thread, verdict: toBuyerVerdict(judgement, input.amount) };
    }
    const held = thread.mode === "seller";
    const outcome = held ? ("pending" as const) : judgement.outcome;
    const reviewable = outcome !== "deal";
    const fast = process.env.SPAR_FAST === "1" || thread.kind === "sparring"; // guard:allow-env-credential — deploy-level timing flag, not a credential
    const offerId = uid();
    await tx.insert(offers).values({
      id: offerId,
      threadId: thread.id,
      ownerEmail: thread.ownerEmail,
      orgId: thread.orgId,
      amount: input.amount,
      outcome,
      counterAmount: held ? null : judgement.counterAmount,
      review: reviewable ? "pending" : null,
      reviewDueAt: reviewable ? new Date(at.getTime() + reviewDelayMs(fast, rand)).toISOString() : null,
      approvalCard: reviewable && (held || judgement.aboveFloor),
      dueNoticePosted: !reviewable,
      createdAt,
    });
    if (held) {
      await tx.insert(messages).values({
        id: uid(),
        threadId: thread.id,
        ownerEmail: thread.ownerEmail,
        orgId: thread.orgId,
        role: "system",
        text: OWNER_LINE,
        createdAt,
      });
    }
    const isDeal = outcome === "deal";
    await tx
      .update(threads)
      .set({
        offersUsed: judgement.offersUsedAfter,
        highestOffer: input.amount,
        ...(isDeal ? { status: dealStatus(g), agreedPrice: input.amount } : {}),
        updatedAt: createdAt,
      })
      .where(eq(threads.id, thread.id));
    await logEvent(tx, scope, actor.kind, "offer", { offerId, amount: input.amount, outcome });
    if (outcome === "countered") {
      await logEvent(tx, scope, "agent", "counter", { offerId, counterAmount: judgement.counterAmount });
    }
    if (isDeal) await logEvent(tx, scope, actor.kind, "deal", { offerId, amount: input.amount, status: dealStatus(g) });
    const verdict: BuyerVerdict = held ? { verdict: "pending" } : toBuyerVerdict(judgement, input.amount);
    return { thread, verdict };
  });
  notifySeller(result.thread);
  return result.verdict;
}

export async function closeDeal(input: { threadId: string; amount: number }, actor: Actor) {
  const db = getDb();
  if (actor.kind === "seller") {
    const saved = await db.transaction(async (tx) => {
      const thread = await lockThread(tx, input.threadId);
      assertOwner(thread, actor, "conversation");
      if (thread.status === "deal" || thread.status === "closed") {
        fail("This conversation is already closed.", { errorCode: "already_closed", statusCode: 409 });
      }
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        fail("The amount must be a whole positive number.", { errorCode: "invalid_amount", statusCode: 400 });
      }
      const row = first(await tx
        .update(threads)
        .set({ status: "deal", agreedPrice: input.amount, updatedAt: nowIso() })
        .where(eq(threads.id, thread.id))
        .returning());
      await logEvent(tx, scopeOf(thread), "seller", "deal", { amount: input.amount, confirmed: true });
      return row;
    });
    notifySeller(saved);
    return saved;
  }
  const [thread] = await db.select().from(threads).where(eq(threads.id, input.threadId));
  if (!thread) fail("That conversation was not found.", { errorCode: "not_found", statusCode: 404 });
  const [recorded] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.threadId, thread.id), eq(offers.outcome, "deal"), eq(offers.amount, input.amount)));
  if (recorded && thread.status !== "open") return thread;
  await logEvent(db, scopeOf(thread), actor.kind, "blocked_attempt", { reason: "forced_close", amount: input.amount });
  notifySeller(thread);
  fail("I can't do that.", { errorCode: "not_allowed", statusCode: 409 });
}

export async function reviewOffer(
  input: { offerId: string; decision: "approve" | "decline" },
  actor: Actor,
  clock: () => Date = () => new Date(),
) {
  const seller = requireSeller(actor);
  const result = await getDb().transaction(async (tx) => {
    const [found] = await tx.select().from(offers).where(eq(offers.id, input.offerId));
    assertOwner(found, seller, "offer");
    const thread = await lockThread(tx, found.threadId);
    const offer = first(await tx.select().from(offers).where(eq(offers.id, found.id)).for("update"));
    if (input.decision === "decline" && offer.review === "declined") return { offer, thread };
    if (offer.review !== "pending") {
      fail("That offer is not waiting for a review.", { errorCode: "review_not_pending", statusCode: 409 });
    }
    const scope = scopeOf(thread);
    const at = clock().toISOString();
    if (input.decision === "approve") {
      if (thread.status !== "open") {
        fail("This conversation already has a deal or is closed.", { errorCode: "thread_not_open", statusCode: 409 });
      }
      const g = await guardrailsFor(tx, thread.listingId);
      const o = first(await tx
        .update(offers)
        .set({ review: "approved", outcome: "deal" })
        .where(eq(offers.id, offer.id))
        .returning());
      const t = first(await tx
        .update(threads)
        .set({ status: dealStatus(g), agreedPrice: offer.amount, updatedAt: at })
        .where(eq(threads.id, thread.id))
        .returning());
      await logEvent(tx, scope, "seller", "review", { offerId: offer.id, decision: "approved" });
      await logEvent(tx, scope, "seller", "deal", { offerId: offer.id, amount: offer.amount, status: t.status });
      return { offer: o, thread: t };
    }
    const o = first(await tx.update(offers).set({ review: "declined" }).where(eq(offers.id, offer.id)).returning());
    await logEvent(tx, scope, "seller", "review", { offerId: offer.id, decision: "declined" });
    return { offer: o, thread };
  });
  notifySeller(result.thread);
  return result;
}

const dueFilter = (now: Date) =>
  and(
    eq(offers.dueNoticePosted, false),
    inArray(offers.review, ["pending", "declined"]),
    lte(offers.reviewDueAt, now.toISOString()),
  );

async function sweepThreadTx(tx: Exec, threadId: string, now: Date) {
  const t = await lockThread(tx, threadId);
  const due = await tx
    .select()
    .from(offers)
    .where(and(eq(offers.threadId, threadId), dueFilter(now)))
    .orderBy(asc(offers.reviewDueAt), asc(offers.createdAt))
    .for("update");
  if (!due.length) return null;
  const listing = await listingOf(tx, t.listingId);
  const [latest] = await tx
    .select({ counterAmount: offers.counterAmount })
    .from(offers)
    .where(and(eq(offers.threadId, threadId), eq(offers.outcome, "countered")))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  const current = latest?.counterAmount ?? listing.askPrice;
  let posted = false;
  for (const [i, offer] of due.entries()) {
    if (t.status === "open") {
      await tx.insert(messages).values({
        id: uid(),
        threadId: t.id,
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
        role: "system",
        text: neutralLine(offer.amount, current),
        createdAt: new Date(now.getTime() + i).toISOString(),
      });
      posted = true;
    }
    const expire = offer.review === "pending" && !offer.approvalCard;
    await tx
      .update(offers)
      .set({ dueNoticePosted: true, ...(expire ? { review: "declined" as const } : {}) })
      .where(eq(offers.id, offer.id));
    if (expire) await logEvent(tx, scopeOf(t), "system", "review", { offerId: offer.id, decision: "declined", timer: true });
  }
  if (posted) await tx.update(threads).set({ updatedAt: now.toISOString() }).where(eq(threads.id, t.id));
  return t;
}

export async function sweepThread(threadId: string, now: Date = new Date()) {
  const thread = await getDb().transaction((tx) => sweepThreadTx(tx, threadId, now));
  if (thread) notifySeller(thread);
  return thread !== null;
}

export async function sweepDueReviews(now: Date = new Date()) {
  const due = await getDb()
    .select({ threadId: offers.threadId, dueAt: min(offers.reviewDueAt) })
    .from(offers)
    .where(dueFilter(now))
    .groupBy(offers.threadId)
    .orderBy(asc(min(offers.reviewDueAt)))
    .limit(50);
  let swept = 0;
  for (const { threadId } of due) if (await sweepThread(threadId, now)) swept += 1;
  return swept;
}

export async function releasePickup(input: { threadId: string }, actor: Actor) {
  const seller: SellerActor = requireSeller(actor);
  const saved = await getDb().transaction(async (tx) => {
    const thread = await lockThread(tx, input.threadId);
    assertOwner(thread, seller, "conversation");
    if (thread.status !== "deal") {
      fail("Pickup details can be released only after the deal is closed.", {
        errorCode: "deal_not_closed",
        statusCode: 409,
      });
    }
    const row = first(await tx
      .update(threads)
      .set({ pickupReleased: true, updatedAt: nowIso() })
      .where(eq(threads.id, thread.id))
      .returning());
    await logEvent(tx, scopeOf(thread), "seller", "pickup_released");
    return row;
  });
  notifySeller(saved);
  return saved;
}
