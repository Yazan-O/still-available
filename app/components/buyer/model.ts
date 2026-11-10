import type { BuyerMessage, BuyerOffer, BuyerThread, PublicListing } from "@shared/buyer";

import type { RobotState } from "@/components/robot/Robot";

import { money } from "./api";
import type { PendingTurn } from "./useBuyerThread";

const FRESH_MS = 20_000;

export type FeedItem =
  | { type: "message"; key: string; at: number; message: BuyerMessage }
  | { type: "offer"; key: string; at: number; offer: BuyerOffer }
  | { type: "pending"; key: string; at: number; pending: PendingTurn };

const t = (iso: string) => Date.parse(iso) || 0;

export function buildFeed(thread: BuyerThread | null, pending: PendingTurn[]): FeedItem[] {
  const items: FeedItem[] = [];
  const messages = thread?.messages ?? [];
  const offers = thread?.offers ?? [];
  messages.forEach((m) => items.push({ type: "message", key: m.id, at: t(m.createdAt), message: m }));
  offers.forEach((o, i) =>
    items.push({ type: "offer", key: `offer-${i}-${o.createdAt}`, at: t(o.createdAt), offer: o }),
  );
  items.sort((a, b) => a.at - b.at);
  const claimed = new Set<string>();
  for (const p of pending) {
    const windowStart = p.at - 10 * 60_000;
    const match = items.find((it) => {
      if (claimed.has(it.key) || it.at < windowStart) return false;
      if (p.kind === "text")
        return it.type === "message" && it.message.role === "buyer" && it.message.text.trim() === p.text?.trim();
      return it.type === "offer" && it.offer.amount === p.amount;
    });
    if (match) claimed.add(match.key);
    else items.push({ type: "pending", key: p.key, at: Number.MAX_SAFE_INTEGER - 1000 + items.length, pending: p });
  }
  return items;
}

export function robotStateFor(
  thread: BuyerThread | null,
  sending: boolean,
  now: number,
): RobotState {
  if (thread?.mode === "seller") return "asleep";
  if (sending) return "thinking";
  if (!thread) return "idle";
  if (thread.status === "deal" || thread.status === "deal_pending") return "deal";
  const lastBuyer = [...thread.messages].reverse().find((m) => m.role === "buyer");
  const lastOffer = thread.offers[thread.offers.length - 1];
  const lastMsg = thread.messages[thread.messages.length - 1];
  const buyerAt = lastBuyer ? t(lastBuyer.createdAt) : 0;
  if (lastOffer && t(lastOffer.createdAt) >= buyerAt) {
    if (lastOffer.outcome === "refused") return "blocking";
    if (lastOffer.outcome === "deal") return "deal";
    return "holding";
  }
  if (lastMsg?.role === "agent" && now - t(lastMsg.createdAt) < FRESH_MS) return "talking";
  if (thread.currentCounter !== null) return "holding";
  return "idle";
}

export function stageLine(
  state: RobotState,
  thread: BuyerThread | null,
  listing: PublicListing,
): string {
  const m = (v: number) => money(v, listing.currency);
  switch (state) {
    case "asleep":
      return listing.status !== "live" && thread?.mode !== "seller"
        ? "Off duty while the listing is closed."
        : "The owner has stepped in. Keeper is on a tea break.";
    case "thinking":
      return "Thinking it over…";
    case "talking":
      return "Said its piece. Your move.";
    case "blocking":
      return "That one didn't count. Offers only go up.";
    case "deal":
      return thread?.agreedPrice != null
        ? `Shook on ${m(thread.agreedPrice)}.`
        : "Shook on it.";
    case "holding":
      return thread?.currentCounter != null
        ? `Holding at ${m(thread.currentCounter)}.`
        : "Holding the price. Politely.";
    default:
      return listing.status === "live"
        ? "Knows every scratch on this one. Ask away."
        : "Off duty for now.";
  }
}

export function laddersFrom(thread: BuyerThread | null) {
  const offers = thread?.offers ?? [];
  return {
    counters: offers
      .filter((o) => o.outcome === "countered" && o.counterAmount !== null)
      .map((o) => o.counterAmount as number),
    offers: offers.map((o) => ({ amount: o.amount, outcome: o.outcome })),
  };
}
