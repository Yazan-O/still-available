import { fail } from "@agent-native/core/action";
import { recordChange } from "@agent-native/core/server";

import { getDb } from "../db/index.js";
import { events } from "../db/schema.js";

export type SellerActor = { kind: "seller"; email: string; orgId: string | null };
export type RobotSideActor = { kind: "agent" | "buyer" | "sparbot" | "system" };
export type Actor = SellerActor | RobotSideActor;

export type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Exec = Db | Tx;

export type EventType = (typeof events.$inferInsert)["type"];

export const uid = () => crypto.randomUUID();

export function first<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("Expected a row from the database");
  return row;
}
export const nowIso = () => new Date().toISOString();
export const money = (amount: number) => `$${amount}`;

export function sellerActor(ctx: { userEmail?: string; orgId?: string | null } | undefined): SellerActor {
  if (!ctx?.userEmail) fail("Sign in first.", { errorCode: "unauthenticated", statusCode: 401 });
  return { kind: "seller", email: ctx.userEmail, orgId: ctx.orgId ?? null };
}

export function requireSeller(actor: Actor): SellerActor {
  if (actor.kind !== "seller") fail("Only the seller can do that.", { errorCode: "forbidden", statusCode: 403 });
  return actor;
}

export function assertOwner(row: { ownerEmail: string } | undefined, actor: SellerActor, what: string): asserts row {
  if (!row || row.ownerEmail !== actor.email) {
    fail(`That ${what} was not found.`, { errorCode: "not_found", statusCode: 404 });
  }
}

export async function logEvent(
  db: Exec,
  scope: { listingId: string; threadId: string | null; ownerEmail: string; orgId: string | null },
  actor: Actor["kind"],
  type: EventType,
  detail: Record<string, unknown> = {},
) {
  await db.insert(events).values({
    id: uid(),
    listingId: scope.listingId,
    threadId: scope.threadId,
    ownerEmail: scope.ownerEmail,
    orgId: scope.orgId,
    actor,
    type,
    detail,
    createdAt: nowIso(),
  });
}

export function notifySeller(owner: { ownerEmail: string; orgId: string | null }) {
  recordChange({
    source: "action",
    type: "change",
    owner: owner.ownerEmail,
    ...(owner.orgId ? { orgId: owner.orgId } : {}),
  });
}

const AGENT_CALLERS = new Set(["tool", "mcp", "a2a", "automation"]);

export const agentNeedsApproval = (_args: unknown, ctx?: { caller?: string | undefined }) =>
  AGENT_CALLERS.has(ctx?.caller ?? "");

export const calledByAgent = (ctx?: { caller?: string | undefined }) => AGENT_CALLERS.has(ctx?.caller ?? "");
