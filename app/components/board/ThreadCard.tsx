import { Link } from "react-router";

import { OfferLadder } from "@/components/robot/OfferLadder";
import { Robot } from "@/components/robot/Robot";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BuyerAvatar } from "./Avatars";
import { ApprovalBadge, BlockedBadge, PickupBadge, StatusChip, TakenOverBadge } from "./Badges";
import {
  ago,
  attackerOf,
  buyerLabel,
  keeperFromDetail,
  keeperView,
  ladderProps,
  money,
  type Guardrails,
  type ThreadSummary,
} from "./model";
import { useThreadDetail } from "./use-board";

const ROLE_PREFIX: Record<string, string> = {
  buyer: "",
  agent: "Keeper: ",
  seller: "You: ",
  system: "",
};

export function ThreadCard({
  thread,
  ask,
  currency,
  guardrails,
}: {
  thread: ThreadSummary;
  ask: number | null;
  currency: string;
  guardrails: Guardrails | undefined;
}) {
  const detail = useThreadDetail(thread.id);
  const d = detail.data;
  const keeper = d
    ? keeperFromDetail(d, currency)
    : keeperView({ thread, lastMessage: thread.lastMessage, currency });
  const ladder = d ? ladderProps(d) : null;
  const attacker = attackerOf(thread);
  const needsYou = thread.pendingReviewCount > 0 || thread.status === "deal_pending" || (thread.status === "deal" && !thread.pickupReleased);
  const last = thread.lastMessage;

  return (
    <Link
      to={`/board/${encodeURIComponent(thread.id)}`}
      className={cn(
        "group flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
        "hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        needsYou ? "border-tag/70" : "border-border",
      )}
      aria-label={`${buyerLabel(thread)}: ${keeper.line}`}
    >
      <div className="flex items-start gap-3">
        <BuyerAvatar thread={thread} size={36} state={attacker ? "talking" : "idle"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{buyerLabel(thread)}</span>
            {attacker ? (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-secondary-foreground">
                Sparring
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">{ago(thread.updatedAt)}</div>
        </div>
        <Robot character="keeper" state={keeper.state} size={44} />
      </div>

      <p className="text-xs font-medium text-foreground/80">{keeper.line}</p>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {last ? (
          <>
            <span className="font-medium text-foreground/70">{ROLE_PREFIX[last.role] ?? ""}</span>
            {last.text}
          </>
        ) : (
          "No messages yet."
        )}
      </p>

      {ask !== null && ladder && ladder.offers.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-tag px-1.5 py-0.5 font-semibold tabular-nums text-tag-foreground">
            Ask {money(ask, currency)}
          </span>
          No offers yet.
        </div>
      ) : ask !== null && ladder ? (
        <div className="rounded-lg bg-background/60 px-2 pb-1 pt-2">
          <OfferLadder
            ask={ask}
            counters={ladder.counters}
            offers={ladder.offers}
            {...(guardrails ? { floor: guardrails.floorPrice, robotLimit: guardrails.robotLimitPrice } : {})}
            currency={currency}
            height={150}
          />
        </div>
      ) : (
        <Skeleton className="h-[158px] w-full rounded-lg" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusChip status={thread.status} />
        <ApprovalBadge count={thread.pendingReviewCount} />
        <PickupBadge waiting={thread.status === "deal" && !thread.pickupReleased} />
        <BlockedBadge count={thread.blockedCount} />
        <TakenOverBadge on={thread.mode === "seller"} />
      </div>
    </Link>
  );
}

export function ThreadCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[158px] w-full rounded-lg" />
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
    </div>
  );
}
