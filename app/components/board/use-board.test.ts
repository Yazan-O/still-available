import { describe, expect, it, vi } from "vitest";

const sync = vi.hoisted(() => ({
  report: undefined as ((connected: boolean) => void) | undefined,
  unsubscribed: 0,
}));

vi.mock("@agent-native/core/client/use-db-sync", () => ({
  subscribeSyncEvents: (options: { onSseStateChange?: (connected: boolean) => void }) => {
    sync.report = options.onSseStateChange;
    options.onSseStateChange?.(false);
    return () => {
      sync.unsubscribed += 1;
    };
  },
}));

import { FALLBACK_POLL_MS, pollIntervalFor, watchPush } from "./use-board";

describe("board polling fallback", () => {
  it("polls every 3 seconds while server push is down and stops once it connects", () => {
    expect(FALLBACK_POLL_MS).toBe(3000);
    expect(pollIntervalFor(false)).toBe(3000);
    expect(pollIntervalFor(true)).toBe(false);
  });

  it("follows the push connection state", () => {
    const seen: boolean[] = [];
    const stop = watchPush((live) => seen.push(live));
    sync.report?.(true);
    sync.report?.(false);
    stop();
    expect(seen.map(pollIntervalFor)).toEqual([3000, false, 3000]);
    expect(sync.unsubscribed).toBe(1);
  });
});
