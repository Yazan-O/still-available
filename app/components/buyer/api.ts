import type {
  BuyerThreadResponse,
  BuyerTurnResponse,
} from "@shared/buyer";

export type BuyerErrorCode =
  | "invalid_request"
  | "not_found"
  | "listing_not_live"
  | "thread_not_open"
  | "rate_limited"
  | "turn_limit"
  | "network"
  | "server";

export class BuyerApiError extends Error {
  code: BuyerErrorCode;
  status: number;
  constructor(code: BuyerErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const KNOWN: BuyerErrorCode[] = [
  "invalid_request",
  "not_found",
  "listing_not_live",
  "thread_not_open",
  "rate_limited",
  "turn_limit",
];

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, credentials: "omit", cache: "no-store" });
  } catch {
    throw new BuyerApiError("network", 0, "Network error");
  }
  if (res.ok) return (await res.json()) as T;
  let body: { error?: string; errorCode?: string } = {};
  try {
    body = await res.json();
  } catch {}
  const code = KNOWN.includes(body.errorCode as BuyerErrorCode)
    ? (body.errorCode as BuyerErrorCode)
    : res.status === 404
      ? "not_found"
      : "server";
  throw new BuyerApiError(code, res.status, body.error ?? res.statusText);
}

export function fetchThread(slug: string, buyerToken: string | null) {
  const q = buyerToken ? `?buyerToken=${encodeURIComponent(buyerToken)}` : "";
  return call<BuyerThreadResponse>(
    `/api/buyer/${encodeURIComponent(slug)}/thread${q}`,
  );
}

export function postTurn(
  slug: string,
  body: {
    buyerToken: string;
    buyerName?: string;
    text?: string;
    offerAmount?: number;
  },
) {
  return call<BuyerTurnResponse>(`/api/buyer/${encodeURIComponent(slug)}/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function store() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function buyerTokenFor(slug: string) {
  const key = `still-available.buyer.${slug}`;
  const s = store();
  const existing = s?.getItem(key);
  if (existing && existing.length >= 8) return existing;
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  s?.setItem(key, token);
  return token;
}

const NAME_KEY = "still-available.buyer-name";

export function readBuyerName(): { name: string | null; decided: boolean } {
  const v = store()?.getItem(NAME_KEY);
  if (v === null || v === undefined) return { name: null, decided: false };
  return { name: v || null, decided: true };
}

export function saveBuyerName(name: string | null) {
  store()?.setItem(NAME_KEY, name ?? "");
}

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}
