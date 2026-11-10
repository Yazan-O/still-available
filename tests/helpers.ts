import { getDbExec } from "@agent-native/core/db";

import { migrations } from "../server/db/migrations.js";
import type { SellerActor } from "../server/lib/common.js";
import { saveListing } from "../server/lib/listings.js";
import { setGuardrails } from "../server/lib/negotiation.js";

let migrated: Promise<void> | null = null;

export function migrate() {
  migrated ??= (async () => {
    const exec = getDbExec();
    for (const m of migrations) {
      const sql = typeof m.sql === "string" ? m.sql : (m.sql.postgres ?? "");
      for (const statement of sql.split(/;\s*\n/)) await exec.execute(statement);
    }
  })();
  return migrated;
}

export const seller: SellerActor = { kind: "seller", email: "seller@example.test", orgId: null };

export async function makeListing(g: {
  ask: number;
  limit: number;
  floor: number;
  steps?: number;
  autoClose?: boolean;
  pickup?: string;
}) {
  const listing = await saveListing(
    { title: "Mid-century desk lamp", description: "Brass lamp", facts: ["Rewired"], askPrice: g.ask, status: "live" },
    seller,
  );
  await setGuardrails(
    {
      listingId: listing.id,
      floorPrice: g.floor,
      robotLimitPrice: g.limit,
      counterSteps: g.steps ?? 3,
      autoClose: g.autoClose ?? false,
      pickupDetails: g.pickup ?? "Porch pickup, 12 Elm St, after 5 pm",
    },
    seller,
  );
  return listing;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FakeStream = { systemPrompt: string; messages: unknown[] };

export function fakeEngine(reply: string, during?: () => Promise<void>) {
  const calls: FakeStream[] = [];
  const engine = {
    name: "fake",
    label: "Fake",
    defaultModel: "claude-haiku-5-5",
    supportedModels: ["claude-haiku-5-5"],
    acceptsCustomModels: true,
    capabilities: { thinking: false, promptCaching: false, vision: false, computerUse: false, parallelToolCalls: false },
    async *stream(opts: { systemPrompt: string; messages: unknown[] }) {
      calls.push({ systemPrompt: opts.systemPrompt, messages: opts.messages });
      if (during) await during();
      yield { type: "text-delta" as const, text: reply };
      yield { type: "assistant-content" as const, parts: [{ type: "text" as const, text: reply }] };
      yield { type: "stop" as const, reason: "end_turn" as const };
    },
  };
  return { engine, calls };
}

export function clockAt(start: number) {
  let t = start;
  return {
    now: () => new Date(t),
    advance: (ms: number) => {
      t += ms;
    },
    get ms() {
      return t;
    },
  };
}

export function stripVolatile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== "id" && k !== "createdAt" && k !== "slug")
        .map(([k, v]) => [k, stripVolatile(v)]),
    );
  }
  return value;
}
