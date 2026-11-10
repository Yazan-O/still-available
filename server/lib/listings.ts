import { randomBytes } from "node:crypto";

import { fail } from "@agent-native/core/action";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import type { PublicListing } from "../../shared/buyer.js";
import { getDb } from "../db/index.js";
import { listings, threads } from "../db/schema.js";
import { type Actor, assertOwner, first, notifySeller, nowIso, requireSeller, uid } from "./common.js";
import { assertAskFitsGuardrails, ensureDefaultGuardrails } from "./negotiation.js";

export type ListingRow = typeof listings.$inferSelect;
export type ListingStatus = ListingRow["status"];

export const publicPath = (slug: string) => `/l/${slug}`;

export function toSellerListing(row: ListingRow) {
  return {
    id: row.id,
    slug: row.slug,
    publicPath: publicPath(row.slug),
    title: row.title,
    description: row.description,
    facts: row.facts,
    photoUrl: row.photoUrl,
    askPrice: row.askPrice,
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicListing(row: ListingRow): PublicListing {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    facts: [...row.facts],
    photoUrl: row.photoUrl,
    askPrice: row.askPrice,
    currency: row.currency,
    status: row.status === "draft" ? "paused" : row.status,
  };
}

export async function listingBySlug(slug: string) {
  const [row] = await getDb().select().from(listings).where(eq(listings.slug, slug));
  if (!row || row.status === "draft") fail("That listing was not found.", { errorCode: "not_found", statusCode: 404 });
  return row;
}

export async function ownedListing(id: string, actor: Actor) {
  const seller = requireSeller(actor);
  const [row] = await getDb().select().from(listings).where(eq(listings.id, id));
  assertOwner(row, seller, "listing");
  return row;
}

export async function listListings(input: { status?: ListingStatus | undefined }, actor: Actor) {
  const seller = requireSeller(actor);
  const db = getDb();
  const rows = await db
    .select()
    .from(listings)
    .where(
      and(eq(listings.ownerEmail, seller.email), input.status ? eq(listings.status, input.status) : undefined),
    )
    .orderBy(desc(listings.updatedAt))
    .limit(200);
  const ids = rows.map((r) => r.id);
  const counts = ids.length
    ? await db
        .select({ listingId: threads.listingId, kind: threads.kind, status: threads.status, n: count() })
        .from(threads)
        .where(and(eq(threads.ownerEmail, seller.email), inArray(threads.listingId, ids)))
        .groupBy(threads.listingId, threads.kind, threads.status)
    : [];
  return rows.map((row) => {
    const mine = counts.filter((c) => c.listingId === row.id && c.kind === "buyer");
    return {
      ...toSellerListing(row),
      threadCount: mine.reduce((s, c) => s + c.n, 0),
      openThreadCount: mine.filter((c) => c.status === "open").reduce((s, c) => s + c.n, 0),
    };
  });
}

export async function getListing(input: { id: string }, actor: Actor) {
  return toSellerListing(await ownedListing(input.id, actor));
}

export type ListingInput = {
  id?: string | undefined;
  title: string;
  description: string;
  facts: string[];
  photoUrl?: string | null | undefined;
  askPrice: number;
  status?: ListingStatus | undefined;
};

export async function saveListing(input: ListingInput, actor: Actor) {
  const seller = requireSeller(actor);
  const at = nowIso();
  const fields = {
    title: input.title.trim(),
    description: input.description.trim(),
    facts: input.facts.map((f) => f.trim()).filter(Boolean),
    askPrice: input.askPrice,
    updatedAt: at,
    ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  if (!fields.title) fail("A listing needs a title.", { errorCode: "title_required", statusCode: 400 });
  const saved = await getDb().transaction(async (tx) => {
    if (input.id) {
      const [row] = await tx.select().from(listings).where(eq(listings.id, input.id)).for("update");
      assertOwner(row, seller, "listing");
      await assertAskFitsGuardrails(tx, row.id, input.askPrice);
      const updated = first(await tx.update(listings).set(fields).where(eq(listings.id, row.id)).returning());
      return updated;
    }
    const created = first(await tx
      .insert(listings)
      .values({
        id: uid(),
        ownerEmail: seller.email,
        orgId: seller.orgId,
        slug: randomBytes(12).toString("base64url"),
        createdAt: at,
        ...fields,
      })
      .returning());
    await ensureDefaultGuardrails(tx, created);
    return created;
  });
  notifySeller(saved);
  return toSellerListing(saved);
}
