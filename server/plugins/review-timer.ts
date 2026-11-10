import { defineNitroPlugin } from "@agent-native/core";

import { sweepDueReviews } from "../lib/negotiation.js";

const SWEEP_MS = 15_000;
const HANDLE = Symbol.for("still-available.review-timer");

type TimerHolder = { [HANDLE]?: ReturnType<typeof setInterval> };

export default defineNitroPlugin(() => {
  const holder = globalThis as TimerHolder;
  if (holder[HANDLE]) clearInterval(holder[HANDLE]);
  const timer = setInterval(() => {
    sweepDueReviews().catch((error) => console.warn("[still-available] review sweep failed:", error));
  }, SWEEP_MS);
  timer.unref?.();
  holder[HANDLE] = timer;
});
