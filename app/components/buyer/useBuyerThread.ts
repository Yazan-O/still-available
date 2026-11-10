import type { BuyerThreadResponse, PublicListing } from "@shared/buyer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BuyerApiError,
  buyerTokenFor,
  fetchThread,
  postTurn,
  readBuyerName,
  saveBuyerName,
  type BuyerErrorCode,
} from "./api";

export type PendingTurn = {
  key: string;
  kind: "text" | "offer";
  text?: string;
  amount?: number;
  at: number;
  status: "queued" | "sending" | "failed";
  error?: BuyerErrorCode;
};

export type Notice = "rate_limited" | "turn_limit" | null;

let seq = 0;

export function useBuyerThread(slug: string, initialListing: PublicListing | null) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState<{ name: string | null; decided: boolean }>({
    name: null,
    decided: true,
  });
  const [pending, setPending] = useState<PendingTurn[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const running = useRef(false);
  const pendingRef = useRef<PendingTurn[]>([]);
  pendingRef.current = pending;
  const nameRef = useRef<string | null>(null);
  nameRef.current = name.name;

  useEffect(() => {
    setToken(buyerTokenFor(slug));
    setName(readBuyerName());
  }, [slug]);

  const queryKey = useMemo(() => ["buyer-thread", slug, token], [slug, token]);

  const query = useQuery<BuyerThreadResponse, BuyerApiError>({
    queryKey,
    queryFn: () => fetchThread(slug, token),
    enabled: token !== null,
    refetchInterval: (q) =>
      q.state.error?.code === "not_found" ? false : 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (count, err) =>
      err.code !== "not_found" && err.code !== "invalid_request" && count < 2,
    staleTime: 1000,
  });

  const update = useCallback(
    (fn: (list: PendingTurn[]) => PendingTurn[]) => {
      pendingRef.current = fn(pendingRef.current);
      setPending(pendingRef.current);
    },
    [],
  );

  const pump = useCallback(async () => {
    if (running.current || !token) return;
    running.current = true;
    try {
      for (;;) {
        const next = pendingRef.current.find((p) => p.status === "queued");
        if (!next) break;
        update((l) =>
          l.map((p) => (p.key === next.key ? { ...p, status: "sending" } : p)),
        );
        try {
          const res = await postTurn(slug, {
            buyerToken: token,
            ...(nameRef.current ? { buyerName: nameRef.current } : {}),
            ...(next.kind === "text" && next.text !== undefined
              ? { text: next.text }
              : {}),
            ...(next.kind === "offer" && next.amount !== undefined
              ? { offerAmount: next.amount }
              : {}),
          });
          await queryClient.cancelQueries({ queryKey });
          queryClient.setQueryData<BuyerThreadResponse>(queryKey, {
            listing: res.listing,
            thread: res.thread,
          });
          update((l) => l.filter((p) => p.key !== next.key));
        } catch (e) {
          const code = e instanceof BuyerApiError ? e.code : "network";
          if (code === "rate_limited" || code === "turn_limit") setNotice(code);
          if (code === "listing_not_live" || code === "thread_not_open") {
            update((l) => l.filter((p) => p.key !== next.key));
            await queryClient.invalidateQueries({ queryKey });
          } else {
            update((l) =>
              l.map((p) =>
                p.key === next.key ? { ...p, status: "failed", error: code } : p,
              ),
            );
          }
          break;
        }
      }
    } finally {
      running.current = false;
    }
  }, [queryClient, queryKey, slug, token, update]);

  const enqueue = useCallback(
    (turn: { kind: "text"; text: string } | { kind: "offer"; amount: number }) => {
      update((l) => [
        ...l,
        { ...turn, key: `p${++seq}`, at: Date.now(), status: "queued" },
      ]);
      void pump();
    },
    [pump, update],
  );

  const retry = useCallback(
    (key: string) => {
      setNotice(null);
      update((l) =>
        l.map((p) => {
          if (p.key !== key) return p;
          const { error: _drop, ...rest } = p;
          return { ...rest, status: "queued" as const };
        }),
      );
      void pump();
    },
    [pump, update],
  );

  const discard = useCallback(
    (key: string) => update((l) => l.filter((p) => p.key !== key)),
    [update],
  );

  const chooseName = useCallback((value: string | null) => {
    const clean = value?.trim().slice(0, 60) || null;
    saveBuyerName(clean);
    setName({ name: clean, decided: true });
  }, []);

  const data = query.data;
  const listing = data?.listing ?? initialListing;

  return {
    token,
    query,
    listing,
    thread: data?.thread ?? null,
    pending,
    notice,
    clearNotice: () => setNotice(null),
    enqueue,
    retry,
    discard,
    name,
    chooseName,
    sending: pending.some((p) => p.status === "sending" || p.status === "queued"),
  };
}
