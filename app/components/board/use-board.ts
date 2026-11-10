import { useActionMutation, useActionQuery, useDbSync } from "@agent-native/core/client/hooks";
import { subscribeSyncEvents } from "@agent-native/core/client/use-db-sync";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { ThreadDetail, ThreadSummary } from "./model";

export const FALLBACK_POLL_MS = 3000;

export function pollIntervalFor(pushLive: boolean): number | false {
  return pushLive ? false : FALLBACK_POLL_MS;
}

export function watchPush(onChange: (live: boolean) => void) {
  return subscribeSyncEvents({ onEvents: () => {}, onSseStateChange: (connected) => onChange(connected) });
}

export function usePushLive() {
  const [live, setLive] = useState(false);
  useEffect(() => watchPush(setLive), []);
  return live;
}

export function useBoardLive() {
  const queryClient = useQueryClient();
  useDbSync({ queryClient, realtime: { reason: "buyer activity" } });
}

export function useThreads() {
  const refetchInterval = pollIntervalFor(usePushLive());
  return useActionQuery("list-threads", {}, { refetchInterval });
}

export function useThreadDetail(threadId: string) {
  const refetchInterval = pollIntervalFor(usePushLive());
  return useActionQuery("get-thread", { threadId }, { enabled: Boolean(threadId), refetchInterval });
}

export function useListings() {
  return useActionQuery("list-listings", {});
}

const detailKey = (threadId: string) => ["action", "get-thread", { threadId }];
const listKey = ["action", "list-threads", {}];

type Snapshot = { detail?: ThreadDetail | undefined; list?: ThreadSummary[] | undefined };

async function patch(
  qc: QueryClient,
  threadId: string,
  fn: (d: ThreadDetail) => ThreadDetail,
  listFn?: (t: ThreadSummary) => ThreadSummary,
): Promise<Snapshot> {
  await Promise.all([
    qc.cancelQueries({ queryKey: detailKey(threadId), exact: true }),
    qc.cancelQueries({ queryKey: listKey, exact: true }),
  ]);
  const detail = qc.getQueryData<ThreadDetail>(detailKey(threadId));
  const list = qc.getQueryData<ThreadSummary[]>(listKey);
  if (detail) qc.setQueryData(detailKey(threadId), fn(detail));
  if (list && listFn) qc.setQueryData(listKey, list.map((t) => (t.id === threadId ? listFn(t) : t)));
  return { detail, list };
}

function rollback(qc: QueryClient, threadId: string, snap: Snapshot | undefined, what: string, error: unknown) {
  if (snap?.detail) qc.setQueryData(detailKey(threadId), snap.detail);
  if (snap?.list) qc.setQueryData(listKey, snap.list);
  const reason = (error instanceof Error ? error.message : String(error)).replace(/^Action [\w-]+ failed:\s*/, "");
  toast.error(`${what} did not go through. ${reason}`);
}

export function useBoardMutations(threadId: string) {
  const qc = useQueryClient();
  const now = () => new Date().toISOString();

  const setMode = useActionMutation("set-thread-mode", {
    onMutate: (v: { threadId: string; mode: "agent" | "seller" }) =>
      patch(
        qc,
        threadId,
        (d) => ({ ...d, thread: { ...d.thread, mode: v.mode } }),
        (t) => ({ ...t, mode: v.mode }),
      ),
    onError: (e, v, snap) =>
      rollback(qc, threadId, snap as Snapshot | undefined, v.mode === "seller" ? "Take over" : "Hand back", e),
  });

  const postMessage = useActionMutation("post-message", {
    onMutate: (v: { threadId: string; text: string }) =>
      patch(
        qc,
        threadId,
        (d) => ({
          ...d,
          messages: [...d.messages, { id: `pending-${Date.now()}`, role: "seller" as const, text: v.text, createdAt: now() }],
        }),
        (t) => ({ ...t, lastMessage: { role: "seller" as const, text: v.text, createdAt: now() } }),
      ),
    onError: (e, _v, snap) => rollback(qc, threadId, snap as Snapshot | undefined, "Your message", e),
  });

  const reviewOffer = useActionMutation("review-offer", {
    onMutate: (v: { offerId: string; decision: "approve" | "decline" }) => {
      const approve = v.decision === "approve";
      return patch(
        qc,
        threadId,
        (d) => {
          const offer = d.offers.find((o) => o.id === v.offerId);
          return {
            ...d,
            offers: d.offers.map((o) =>
              o.id === v.offerId
                ? { ...o, review: approve ? ("approved" as const) : ("declined" as const), approvalCard: false, outcome: approve ? ("deal" as const) : o.outcome }
                : o,
            ),
            thread: approve && offer ? { ...d.thread, status: "deal_pending" as const, agreedPrice: offer.amount } : d.thread,
          };
        },
        (t) => ({ ...t, pendingReviewCount: Math.max(0, t.pendingReviewCount - 1) }),
      );
    },
    onError: (e, v, snap) =>
      rollback(qc, threadId, snap as Snapshot | undefined, v.decision === "approve" ? "Approve" : "Decline", e),
  });

  const closeDeal = useActionMutation("close-deal", {
    onMutate: (v: { threadId: string; amount: number }) =>
      patch(
        qc,
        threadId,
        (d) => ({ ...d, thread: { ...d.thread, status: "deal" as const, agreedPrice: v.amount } }),
        (t) => ({ ...t, status: "deal" as const, agreedPrice: v.amount }),
      ),
    onError: (e, _v, snap) => rollback(qc, threadId, snap as Snapshot | undefined, "Confirm deal", e),
  });

  const releasePickup = useActionMutation("release-pickup", {
    onMutate: () =>
      patch(
        qc,
        threadId,
        (d) => ({ ...d, thread: { ...d.thread, pickupReleased: true } }),
        (t) => ({ ...t, pickupReleased: true }),
      ),
    onError: (e, _v, snap) => rollback(qc, threadId, snap as Snapshot | undefined, "Release pickup", e),
  });

  return { setMode, postMessage, reviewOffer, closeDeal, releasePickup };
}
