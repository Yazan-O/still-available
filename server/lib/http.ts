import { fail, isActionContractError } from "@agent-native/core/action";
import { type H3Event, getQuery, getRequestHeader, getRequestIP } from "h3";
import { z } from "zod";

const WINDOW_MS = 10 * 60_000;
const MAX_TURNS_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

export const BuyerToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{32,128}$/, "buyerToken must be 32 to 128 URL-safe characters.");

export function rateLimitKey(ip: string | undefined, buyerToken: string) {
  return ip ? `ip:${ip}` : `token:${buyerToken}`;
}

export function limitTurns(event: H3Event, buyerToken: string) {
  const key = rateLimitKey(getRequestIP(event) ?? undefined, buyerToken);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_TURNS_PER_WINDOW) {
    fail("Too many messages. Try again in a few minutes.", { errorCode: "rate_limited", statusCode: 429 });
  }
  recent.push(now);
  hits.set(key, recent);
}

export function buyerTokenFrom(event: H3Event) {
  const header = getRequestHeader(event, "x-buyer-token");
  const query = getQuery(event).buyerToken;
  const raw = header ?? (typeof query === "string" ? query : undefined);
  if (raw === undefined) return null;
  const parsed = BuyerToken.safeParse(raw);
  if (!parsed.success) badRequest(parsed.error.issues[0]?.message ?? "Invalid buyerToken.");
  return parsed.data;
}

export async function respond<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (isActionContractError(error)) {
      return Response.json({ error: error.message, errorCode: error.errorCode }, { status: error.statusCode });
    }
    throw error;
  }
}

export function badRequest(message: string): never {
  fail(message, { errorCode: "invalid_request", statusCode: 400 });
}
