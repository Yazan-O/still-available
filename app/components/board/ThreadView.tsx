import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect } from "react";
import { Link } from "react-router";

import { OfferLadder } from "@/components/robot/OfferLadder";
import { Robot } from "@/components/robot/Robot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { setBoardThreadListing } from "@/hooks/use-navigation-state";
import { cn } from "@/lib/utils";

import { ActionCards } from "./ActionCards";
import { BuyerAvatar } from "./Avatars";
import { BlockedBadge, StatusChip } from "./Badges";
import { Composer, Conversation } from "./Conversation";
import { buyerLabel, keeperFromDetail, ladderProps, type ThreadDetail } from "./model";
import { Timeline } from "./Timeline";
import { useBoardMutations, useThreadDetail } from "./use-board";

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

function KeeperPanel({
  detail,
  currency,
  onToggle,
  switching,
}: {
  detail: ThreadDetail;
  currency: string;
  onToggle: (seller: boolean) => void;
  switching: boolean;
}) {
  const keeper = keeperFromDetail(detail, currency);
  const seller = detail.thread.mode === "seller";
  const blocked = detail.events.filter((e) => e.type === "blocked_attempt").length;
  const line = switching ? (seller ? "Powering down. One moment." : "Waking up. One moment.") : keeper.line;
  return (
    <Panel className="flex items-center gap-4 p-4">
      <Robot character="keeper" state={keeper.state} size={96} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Keeper</span>
          <p className="text-sm font-medium" aria-live="polite">
            {line}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch id="take-over" checked={seller} disabled={switching} onCheckedChange={onToggle} />
            <Label htmlFor="take-over" className="text-sm font-semibold">
              Take over
            </Label>
          </div>
          <BlockedBadge count={blocked} />
        </div>
      </div>
    </Panel>
  );
}

function ThreadHeader({ detail, listingTitle }: { detail: ThreadDetail; listingTitle: string | undefined }) {
  const t = detail.thread;
  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Back to the board">
        <Link to="/board">
          <IconArrowLeft size={18} />
        </Link>
      </Button>
      <BuyerAvatar thread={t} size={32} state="idle" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{buyerLabel(t)}</div>
        <div className="truncate text-xs text-muted-foreground">{listingTitle ?? " "}</div>
      </div>
      <StatusChip status={t.status} />
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_400px] lg:p-6" aria-busy="true">
      <Panel className="flex flex-col gap-4 p-4 lg:row-span-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className={cn("h-14 rounded-2xl", i % 2 ? "ml-auto w-1/2" : "w-2/3")} />
        ))}
        <Skeleton className="mt-auto h-10 w-full" />
      </Panel>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ThreadView({ threadId }: { threadId: string }) {
  const q = useThreadDetail(threadId);
  const d = q.data;
  const listingId = d?.thread.listingId ?? "";
  const listing = useActionQuery("get-listing", { id: listingId }, { enabled: Boolean(listingId) });
  const guardrails = useActionQuery("get-guardrails", { listingId }, { enabled: Boolean(listingId) });
  const m = useBoardMutations(threadId);

  useEffect(() => {
    if (listingId) setBoardThreadListing(threadId, listingId);
  }, [threadId, listingId]);

  if (q.isLoading) return <ThreadSkeleton />;
  if (!d) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Robot character="keeper" state="thinking" size={96} />
        <p className="text-sm text-muted-foreground">
          {q.error ? `This conversation did not load. ${q.error.message}` : "This conversation was not found."}
        </p>
        <Button asChild variant="outline">
          <Link to="/board">Back to the board</Link>
        </Button>
      </div>
    );
  }

  const currency = listing.data?.currency ?? "USD";
  const keeper = keeperFromDetail(d, currency);
  const ladder = ladderProps(d);
  const sellerMode = d.thread.mode === "seller";

  return (
    <div className="flex flex-col gap-4 p-4 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5 lg:overflow-hidden lg:p-6">
      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
        <KeeperPanel
          detail={d}
          currency={currency}
          onToggle={(on) => m.setMode.mutate({ threadId, mode: on ? "seller" : "agent" })}
          switching={m.setMode.isPending}
        />
        <ActionCards detail={d} currency={currency} guardrails={guardrails.data} m={m} />
      </div>

      <Panel className="flex min-h-[28rem] flex-col overflow-hidden lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0">
        <div className="border-b border-border px-4 py-3">
          <ThreadHeader detail={d} listingTitle={listing.data?.title} />
        </div>
        <Conversation
          detail={d}
          currency={currency}
          keeperState={keeper.state}
          className="max-h-[52vh] min-h-48 flex-1 overflow-y-auto lg:max-h-none lg:min-h-0"
        />
        <Composer
          enabled={sellerMode && !m.setMode.isPending}
          pending={m.postMessage.isPending}
          onSend={(text) => m.postMessage.mutate({ threadId, text })}
        />
      </Panel>

      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:overflow-y-auto lg:pr-1">
        {listing.data ? (
          <Panel className="flex flex-col gap-2 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Offers</h3>
            <OfferLadder
              ask={listing.data.askPrice}
              counters={ladder.counters}
              offers={ladder.offers}
              {...(guardrails.data ? { floor: guardrails.data.floorPrice, robotLimit: guardrails.data.robotLimitPrice } : {})}
              currency={currency}
              height={ladder.offers.length ? 240 : 150}
            />
          </Panel>
        ) : (
          <Skeleton className="h-[290px] w-full rounded-xl" />
        )}
        <Panel className="p-4">
          <Timeline detail={d} currency={currency} />
        </Panel>
      </div>
    </div>
  );
}
