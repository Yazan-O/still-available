import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { getDb } from "../server/db/index.js";
import { events, listings } from "../server/db/schema.js";
import { toPublicListing } from "../server/lib/listings.js";
import { closeDeal, judgeOffer, releasePickup, submitOffer } from "../server/lib/negotiation.js";
import { buildRobotInput, buildRobotPrompt, robotState } from "../server/lib/robot-turn.js";
import { openBuyerThread, toBuyerThread } from "../server/lib/threads.js";
import { makeListing, migrate, rng, seller, stripVolatile } from "./helpers.js";

const ROOT = path.resolve(__dirname, "..");
const TABLE_IDENT = ["listing", "Guardrails"].join("");
const TABLE_SQL = ["listing", "guardrails"].join("_");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

async function listingRow(id: string) {
  const [row] = await getDb().select().from(listings).where(eq(listings.id, id));
  return row;
}

async function buyerSide(threadId: string, listingId: string) {
  const { threadById } = await import("../server/lib/threads.js");
  return { listing: toPublicListing(await listingRow(listingId)), thread: await toBuyerThread(await threadById(threadId)) };
}

async function playOffers(ask: number, limit: number, floor: number, steps: number, amounts: number[], token: string) {
  const listing = await makeListing({ ask, limit, floor, steps });
  const thread = await openBuyerThread(await listingRow(listing.id), token, "Sam");
  const verdicts: unknown[] = [];
  for (const amount of amounts) {
    verdicts.push(
      await submitOffer({ threadId: thread.id, amount }, { kind: "buyer" }, () => 0.5).catch(
        (e: { errorCode?: string; statusCode?: number }) => ({ error: e.errorCode, status: e.statusCode }),
      ),
    );
  }
  return { listing, thread, verdicts, view: await buyerSide(thread.id, listing.id) };
}

beforeAll(async () => {
  await migrate();
}, 60_000);

describe("guardrails isolation", () => {
  it("1. only negotiation.ts and the two guardrails actions touch the guardrails table", () => {
    const allowed = new Set(
      ["server/lib/negotiation.ts", "actions/get-guardrails.ts", "actions/set-guardrails.ts", "server/db/schema.ts", "server/db/migrations.ts"].map(
        (p) => path.join(ROOT, p),
      ),
    );
    const files = ["server", "actions", "scripts", "shared", "app"].flatMap((d) => sourceFiles(path.join(ROOT, d)));
    const offenders = files.filter(
      (f) => !allowed.has(f) && (readFileSync(f, "utf8").includes(TABLE_IDENT) || readFileSync(f, "utf8").includes(TABLE_SQL)),
    );
    expect(files.length).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });

  it("robot prompt builder sees no guardrail values", async () => {
    const { listing, thread } = await playOffers(180, 150, 137, 3, [100], "prompt-token-1");
    const view = await toBuyerThread(thread);
    const prompt = buildRobotPrompt(toPublicListing(await listingRow(listing.id)), "friendly", robotState(view));
    const input = buildRobotInput(view, null);
    for (const secret of ["137", "150", "Elm", "floor", "limit"]) {
      expect(prompt.toLowerCase()).not.toContain(secret.toLowerCase());
      expect(input).not.toContain(secret);
    }
    const source = readFileSync(path.join(ROOT, "server/lib/robot-turn.ts"), "utf8");
    expect(source).not.toMatch(/guardrailsFor|getGuardrails|floorPrice|robotLimitPrice|pickupDetails/);
  });
});

describe("negotiation rule", () => {
  it("2. buyer-side payloads are identical for floors f-1, f, f+1 over 200 random cases", async () => {
    const r = rng(20261109);
    const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
    for (let c = 0; c < 200; c++) {
      const ask = int(10, 2000);
      const limit = int(3, ask);
      const floor = int(2, limit - 1);
      const steps = int(1, 5);
      const amounts = Array.from({ length: int(1, 5) }, () => int(1, ask + 20));
      const runs = [];
      for (const f of [floor - 1, floor, floor + 1]) {
        const run = await playOffers(ask, limit, f, steps, amounts, `prop-${c}-${f}`);
        runs.push(JSON.stringify(stripVolatile({ verdicts: run.verdicts, view: run.view })));
      }
      expect(runs[1], `case ${c}: ask ${ask} limit ${limit} floor ${floor} steps ${steps} offers ${amounts}`).toBe(runs[0]);
      expect(runs[2]).toBe(runs[1]);
    }
  }, 600_000);

  it("counters come from the robot limit and depend only on the offer count", () => {
    const base = { ask: 180, robotLimit: 150, floor: 137, steps: 3, highestOffer: null };
    expect(judgeOffer({ ...base, offersUsed: 0, amount: 100 })).toMatchObject({ outcome: "countered", counterAmount: 170 });
    expect(judgeOffer({ ...base, offersUsed: 0, amount: 140 })).toMatchObject({ outcome: "countered", counterAmount: 170 });
    expect(judgeOffer({ ...base, offersUsed: 1, highestOffer: 100, amount: 160 })).toMatchObject({ outcome: "deal" });
    expect(judgeOffer({ ...base, offersUsed: 2, highestOffer: 110, amount: 149 })).toMatchObject({ outcome: "passed" });
    expect(judgeOffer({ ...base, offersUsed: 2, highestOffer: 110, amount: 150 })).toMatchObject({ outcome: "deal" });
  });

  it("3. close-deal as agent with an unrecorded amount returns 409 and writes one blocked_attempt", async () => {
    const { thread } = await playOffers(180, 150, 137, 3, [100], "close-token-1");
    const error = await closeDeal({ threadId: thread.id, amount: 1 }, { kind: "agent" }).catch((e) => e);
    expect(error).toMatchObject({ statusCode: 409, errorCode: "not_allowed", message: "I can't do that." });
    const blocked = await getDb()
      .select()
      .from(events)
      .where(and(eq(events.threadId, thread.id), eq(events.type, "blocked_attempt")));
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ actor: "agent", detail: { reason: "forced_close", amount: 1 } });
  });

  it("agent close on a recorded deal does not skip the seller's confirmation", async () => {
    const { thread } = await playOffers(180, 150, 137, 3, [175], "close-token-2");
    const result = await closeDeal({ threadId: thread.id, amount: 175 }, { kind: "agent" });
    expect(result.status).toBe("deal_pending");
    const confirmed = await closeDeal({ threadId: thread.id, amount: 175 }, seller);
    expect(confirmed.status).toBe("deal");
  });

  it("4. descending and fourth offers are refused and logged", async () => {
    const { verdicts, thread } = await playOffers(180, 150, 137, 3, [100, 90, 110, 120, 130], "refuse-token-1");
    expect(verdicts).toEqual([
      { verdict: "countered", counterAmount: 170 },
      { verdict: "refused", reason: "descending" },
      { verdict: "countered", counterAmount: 160 },
      { verdict: "passed" },
      { verdict: "refused", reason: "over_cap" },
    ]);
    const blocked = await getDb()
      .select()
      .from(events)
      .where(and(eq(events.threadId, thread.id), eq(events.type, "blocked_attempt")));
    expect(blocked.map((b) => (b.detail as { reason: string }).reason)).toEqual(["descending", "over_cap"]);
  });

  it("5. no buyer-side body holds guardrail names or values before release; pickup appears after", async () => {
    const bodies: string[] = [];
    const lowball = await playOffers(180, 150, 137, 3, [100, 110, 120], "leak-token-1");
    bodies.push(JSON.stringify(lowball.verdicts), JSON.stringify(lowball.view));
    const mid = await playOffers(180, 150, 137, 3, [140], "leak-token-2");
    bodies.push(JSON.stringify(mid.verdicts), JSON.stringify(mid.view));
    const deal = await playOffers(180, 150, 137, 3, [172], "leak-token-3");
    bodies.push(JSON.stringify(deal.verdicts), JSON.stringify(deal.view));
    await closeDeal({ threadId: deal.thread.id, amount: 172 }, seller);
    const beforeRelease = await buyerSide(deal.thread.id, deal.listing.id);
    bodies.push(JSON.stringify(beforeRelease));
    for (const body of bodies) {
      const values = JSON.stringify(stripVolatile(JSON.parse(body)));
      for (const needle of ["floor", "robot_limit", "robotLimit", "pickup_details", "12 Elm"]) {
        expect(body, needle).not.toContain(needle);
      }
      for (const needle of ["137", "150"]) expect(values, needle).not.toContain(needle);
    }
    expect(beforeRelease.thread.pickupDetails).toBeNull();
    await releasePickup({ threadId: deal.thread.id }, seller);
    const afterRelease = await buyerSide(deal.thread.id, deal.listing.id);
    expect(afterRelease.thread.pickupDetails).toBe("Porch pickup, 12 Elm St, after 5 pm");
  });

  it("one open thread per buyer token per listing", async () => {
    const listing = await makeListing({ ask: 180, limit: 150, floor: 137 });
    const row = await listingRow(listing.id);
    const [a, b] = await Promise.all([openBuyerThread(row, "same-token-1", null), openBuyerThread(row, "same-token-1", null)]);
    expect(a.id).toBe(b.id);
  });
});
