import type { PublicListing } from "@shared/buyer";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Composer, Disclosure, NamePrompt, Starters } from "./Composer";
import { Conversation } from "./Conversation";
import { KeeperMini, KeeperStage, LadderCard } from "./KeeperStage";
import { ListingCompact, ListingFull } from "./ListingPanel";
import { buildFeed, robotStateFor } from "./model";
import {
  ClosedPanel,
  ConversationSkeleton,
  LoadErrorState,
  NoticePanel,
  NotFoundState,
  PageSkeleton,
  Shell,
  ThreadError,
} from "./States";
import { useBuyerThread } from "./useBuyerThread";

function ownScroll(el: HTMLElement | null) {
  return !!el && getComputedStyle(el).overflowY === "auto";
}

function isAtBottom(el: HTMLElement | null) {
  if (ownScroll(el) && el) return el.scrollTop + el.clientHeight >= el.scrollHeight - 96;
  const doc = document.documentElement;
  return window.innerHeight + window.scrollY >= doc.scrollHeight - 96;
}

function toBottom(el: HTMLElement | null) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (ownScroll(el) && el) el.scrollTo({ top: el.scrollHeight, behavior });
  else window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
}

export function BuyerPage({
  slug,
  initialListing,
  notFound,
}: {
  slug: string;
  initialListing: PublicListing | null;
  notFound: boolean;
}) {
  const b = useBuyerThread(slug, initialListing);
  const { query, listing, thread, pending } = b;
  const feed = useMemo(() => buildFeed(thread, pending), [thread, pending]);
  const now = query.dataUpdatedAt || Date.now();
  const dealt = thread?.status === "deal" || thread?.status === "deal_pending";
  const robotState =
    listing && listing.status !== "live" && !dealt ? "asleep" : robotStateFor(thread, b.sending, now);

  const scroller = useRef<HTMLDivElement>(null);
  const prefill = useRef<((text: string) => void) | null>(null);
  const lastKey = feed[feed.length - 1]?.key ?? "";
  const wasAtBottom = useRef(true);
  const ownSend = useRef(false);
  const seenFirst = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageGone, setStageGone] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStageGone(!!e && !e.isIntersecting && e.boundingClientRect.top < 0), {
      rootMargin: "-48px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [listing !== null]);

  useLayoutEffect(() => {
    const onScroll = () => {
      wasAtBottom.current = isAtBottom(scroller.current);
    };
    const el = scroller.current;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [listing !== null]);

  useLayoutEffect(() => {
    if (!lastKey) return;
    if (!seenFirst.current) {
      seenFirst.current = true;
      if (ownScroll(scroller.current) && scroller.current)
        scroller.current.scrollTop = scroller.current.scrollHeight;
      return;
    }
    if (ownSend.current || wasAtBottom.current) {
      ownSend.current = false;
      toBottom(scroller.current);
    }
  }, [lastKey, b.sending]);

  if (notFound || query.error?.code === "not_found") return <NotFoundState />;
  if (!listing) {
    if (query.isError)
      return <LoadErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />;
    return <PageSkeleton />;
  }

  const open = listing.status === "live" && (thread === null || thread.status === "open");
  const outOfTurns = thread !== null && thread.turnsLeft <= 0;
  const notice = outOfTurns
    ? "turn_limit"
    : (b.notice ?? (query.isError && query.data ? "offline" : null));
  const blocked = !open || outOfTurns || b.notice === "turn_limit";
  const hasBuyerTurn =
    (thread?.messages.some((m) => m.role === "buyer") ?? false) ||
    (thread?.offers.length ?? 0) > 0 ||
    pending.length > 0;
  const threadFailed = query.isError && !query.data;
  const loadingThread = b.token === null || (!query.data && !query.isError);
  const fresh = open && !hasBuyerTurn && !loadingThread && !threadFailed;

  const send = (text: string) => {
    ownSend.current = true;
    if (!b.name.decided) b.chooseName(null);
    b.enqueue({ kind: "text", text });
  };
  const offer = (amount: number) => {
    ownSend.current = true;
    if (!b.name.decided) b.chooseName(null);
    b.enqueue({ kind: "offer", amount });
  };

  return (
    <Shell mini={stageGone ? <KeeperMini listing={listing} thread={thread} state={robotState} /> : undefined}>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] gap-3 px-4 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-none lg:items-start lg:gap-6">
        <aside className="flex min-w-0 flex-col gap-4">
          <ListingCompact listing={listing} />
          <ListingFull listing={listing} />
          <LadderCard listing={listing} thread={thread} className="hidden lg:flex" />
        </aside>
        <main className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-3 lg:h-[calc(100dvh-4.25rem)] lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border">
          <div ref={stageRef}>
            <KeeperStage
              listing={listing}
              thread={thread}
              state={robotState}
              className="lg:rounded-none lg:border-0 lg:border-b"
            />
          </div>
          {thread && thread.offers.length ? (
            <LadderCard listing={listing} thread={thread} className="lg:hidden" />
          ) : null}
          <div
            ref={scroller}
            className="min-h-[28vh] flex-1 px-0.5 pb-3 pt-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:px-5 lg:py-5"
          >
            {threadFailed ? (
              <ThreadError onRetry={() => void query.refetch()} retrying={query.isFetching} />
            ) : loadingThread ? (
              <ConversationSkeleton />
            ) : (
              <div className="flex flex-col gap-3.5">
                <Conversation
                  listing={listing}
                  thread={thread}
                  feed={feed}
                  robotState={robotState}
                  typing={b.sending && thread?.mode !== "seller"}
                  onRetry={b.retry}
                  onDiscard={b.discard}
                />
                {fresh && !b.name.decided ? (
                  <div className="pl-[46px] pr-4 sm:max-w-md">
                    <NamePrompt onChoose={b.chooseName} />
                  </div>
                ) : null}
                {fresh ? (
                  <Starters
                    currency={listing.currency}
                    disabled={blocked}
                    onSend={send}
                    onPrefill={(t) => prefill.current?.(t)}
                  />
                ) : null}
              </div>
            )}
          </div>
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-border bg-background px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:px-4">
            <NoticePanel notice={notice} onDismiss={b.clearNotice} />
            {threadFailed ? null : open && !outOfTurns ? (
              <Composer
                listing={listing}
                thread={thread}
                onSendText={send}
                onOffer={offer}
                blocked={blocked}
                prefillRef={prefill}
              />
            ) : (
              <ClosedPanel listing={listing} thread={thread} />
            )}
            <Disclosure />
          </div>
        </main>
      </div>
    </Shell>
  );
}
