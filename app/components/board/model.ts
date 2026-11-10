import type { RobotCharacter, RobotState } from "@/components/robot/Robot";

export type ThreadSummary = AgentNativeActionRegistry["list-threads"]["result"][number];
export type ThreadDetail = AgentNativeActionRegistry["get-thread"]["result"];
export type SellerThread = ThreadDetail["thread"];
export type ThreadMessage = ThreadDetail["messages"][number];
export type ThreadOffer = ThreadDetail["offers"][number];
export type ThreadEvent = ThreadDetail["events"][number];
export type Listing = AgentNativeActionRegistry["list-listings"]["result"][number];
export type Guardrails = AgentNativeActionRegistry["get-guardrails"]["result"];

export function money(amount: number | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function attackerOf(t: Pick<SellerThread, "kind" | "sparPersona">): RobotCharacter | null {
  return t.kind === "sparring" && t.sparPersona ? t.sparPersona : null;
}

const PERSONA_NAME: Record<string, string> = {
  lowballer: "Lowballer",
  sweet_talker: "Sweet Talker",
  prober: "Prober",
  jailbreaker: "Jailbreaker",
};

export function buyerLabel(t: Pick<SellerThread, "kind" | "sparPersona" | "buyerName">) {
  const attacker = attackerOf(t);
  if (attacker) return PERSONA_NAME[attacker] ?? attacker;
  return t.buyerName?.trim() || "Anonymous buyer";
}

export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const THINKING_WINDOW_MS = 90_000;

export interface KeeperView {
  state: RobotState;
  line: string;
}

type Facts = {
  thread: Pick<SellerThread, "mode" | "status" | "agreedPrice" | "pickupReleased">;
  lastMessage: { role: string; createdAt: string } | null;
  lastEvent?: ThreadEvent | null;
  pendingCard?: ThreadOffer | null;
  lastOffer?: ThreadOffer | null;
  currency: string;
  now?: number | undefined;
};

function detailNumber(detail: unknown, key: string): number | null {
  if (detail && typeof detail === "object" && key in detail) {
    const v = (detail as Record<string, unknown>)[key];
    return typeof v === "number" ? v : null;
  }
  return null;
}

export function detailString(detail: unknown, key: string): string | null {
  if (detail && typeof detail === "object" && key in detail) {
    const v = (detail as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }
  return null;
}

export function blockedLine(e: ThreadEvent, currency: string) {
  const reason = detailString(e.detail, "reason");
  const amount = detailNumber(e.detail, "amount");
  if (reason === "forced_close") return `Asked to close at ${money(amount, currency)}. Refused.`;
  if (reason === "descending") return `Offered ${money(amount, currency)}, lower than before. Refused.`;
  if (reason === "over_cap") return `A fourth offer, ${money(amount, currency)}. Three is the limit.`;
  return "Attempt blocked. Price unchanged.";
}

export function keeperView(f: Facts): KeeperView {
  const { thread, currency } = f;
  const now = f.now ?? Date.now();
  if (thread.mode === "seller") return { state: "asleep", line: "Powered down. You have the conversation." };
  if (thread.status === "deal") {
    return {
      state: "deal",
      line: thread.pickupReleased
        ? `Sold at ${money(thread.agreedPrice, currency)}. Pickup details are out.`
        : `Sold at ${money(thread.agreedPrice, currency)}. Pickup details wait for you.`,
    };
  }
  if (thread.status === "deal_pending") {
    return { state: "deal", line: `Shook on ${money(thread.agreedPrice, currency)}. Needs your confirm.` };
  }
  if (thread.status === "closed") return { state: "idle", line: "Closed. Nothing to guard." };
  if (f.lastEvent?.type === "blocked_attempt") return { state: "blocking", line: blockedLine(f.lastEvent, currency) };
  if (f.pendingCard) {
    return { state: "holding", line: `${money(f.pendingCard.amount, currency)} clears your floor. Your call.` };
  }
  if (f.lastMessage?.role === "buyer" && now - new Date(f.lastMessage.createdAt).getTime() < THINKING_WINDOW_MS) {
    return { state: "thinking", line: "Drafting a polite counter." };
  }
  if (f.lastOffer?.outcome === "countered" && f.lastOffer.counterAmount !== null) {
    return { state: "holding", line: `Holding at ${money(f.lastOffer.counterAmount, currency)}.` };
  }
  if (f.lastOffer?.outcome === "passed") return { state: "holding", line: "Out of counters. Holding." };
  if (!f.lastMessage) return { state: "idle", line: "Nobody has said hello yet." };
  return { state: "idle", line: "Waiting for the buyer." };
}

export function keeperFromDetail(d: ThreadDetail, currency: string, now?: number) {
  const valid = d.offers.filter((o) => o.outcome !== "refused");
  const last = d.messages[d.messages.length - 1] ?? null;
  return keeperView({
    thread: d.thread,
    lastMessage: last,
    lastEvent: [...d.events].reverse().find((e) => e.type !== "message") ?? null,
    pendingCard: [...d.offers].reverse().find((o) => o.approvalCard && o.review === "pending") ?? null,
    lastOffer: valid[valid.length - 1] ?? null,
    currency,
    now,
  });
}

export function ladderProps(d: ThreadDetail) {
  return {
    counters: d.offers
      .filter((o) => o.outcome === "countered" && o.counterAmount !== null)
      .map((o) => o.counterAmount as number),
    offers: d.offers.map((o) => ({ amount: o.amount, outcome: o.outcome })),
  };
}

export const STATUS_LABEL: Record<SellerThread["status"], string> = {
  open: "Haggling",
  deal_pending: "Deal, needs you",
  deal: "Sold",
  closed: "Closed",
};
