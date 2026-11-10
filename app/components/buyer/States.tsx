import type { BuyerThread, PublicListing } from "@shared/buyer";
import {
  IconCircleCheck,
  IconClockHour4,
  IconHourglass,
  IconMapPin,
  IconPlayerPause,
  IconRefresh,
  IconWifiOff,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Robot, type RobotState } from "@/components/robot/Robot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { money } from "./api";

export function Shell({ children, mini }: { children: ReactNode; mini?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header
        className={cn(
          "top-0 z-20 bg-background",
          mini ? "sticky border-b border-border lg:static lg:border-0" : "relative",
        )}
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center px-4 sm:px-6">
          <span
            className={cn(
              "items-center gap-1.5 text-sm font-semibold tracking-[-0.01em]",
              mini ? "hidden lg:inline-flex" : "inline-flex",
            )}
          >
            <span aria-hidden className="inline-block size-2.5 rotate-45 rounded-[3px] bg-tag" />
            Still available?
          </span>
          {mini ? <div className="flex min-w-0 flex-1 items-center lg:hidden">{mini}</div> : null}
        </div>
      </header>
      {children}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <Shell>
      <div
        className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8"
        aria-busy="true"
        aria-label="Loading listing"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
            <Skeleton className="size-14 shrink-0 rounded-xl lg:aspect-[2/1] lg:size-auto lg:w-full lg:rounded-2xl" />
            <div className="flex flex-1 flex-col justify-center gap-2.5">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-6 w-28 max-lg:hidden" />
            </div>
          </div>
          <div className="hidden gap-1.5 lg:flex">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="hidden h-10 w-full lg:block" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5">
            <Robot character="keeper" state="asleep" size={60} decorative />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <ConversationSkeleton />
        </div>
      </div>
    </Shell>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <div className="flex items-end gap-2.5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
    </div>
  );
}

function Centered({
  state,
  title,
  body,
  action,
}: {
  state: RobotState;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Shell>
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 pb-16 pt-[12vh] text-center">
        <Robot character="keeper" state={state} size={150} />
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{body}</p>
        {action}
      </main>
    </Shell>
  );
}

export function NotFoundState() {
  return (
    <Centered
      state="asleep"
      title="This listing isn't here"
      body="The link may be mistyped, or the seller took the listing down. Check the link you were sent."
    />
  );
}

export function LoadErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <Centered
      state="idle"
      title="We couldn't load this listing"
      body="Check your connection and try again."
      action={
        <Button onClick={onRetry} disabled={retrying}>
          <IconRefresh size={16} aria-hidden className={cn(retrying && "animate-spin")} />
          Try again
        </Button>
      }
    />
  );
}

function Panel({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  tone?: "default" | "deal" | "warn";
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border bg-card px-3.5 py-3",
        tone === "deal" && "border-deal/60",
        tone === "warn" && "border-tag/60",
        tone === "default" && "border-border",
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0",
          tone === "deal" ? "text-deal" : tone === "warn" ? "text-tag" : "text-muted-foreground",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}

export function ClosedPanel({
  listing,
  thread,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
}) {
  const m = (v: number) => money(v, listing.currency);
  if (thread?.status === "deal_pending")
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-full border border-deal/50 bg-deal/10 py-1.5 pl-2 pr-3.5 text-sm"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-deal text-background" aria-hidden>
          <IconHourglass size={14} stroke={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold tabular-nums">Deal at {m(thread.agreedPrice ?? 0)}.</span>{" "}
          <span className="text-muted-foreground">The owner confirms here soon.</span>
        </span>
      </div>
    );
  if (thread?.status === "deal")
    return (
      <Panel icon={<IconCircleCheck size={20} />} title={`It's yours for ${m(thread.agreedPrice ?? 0)}.`} tone="deal">
        {thread.pickupDetails ? (
          <span className="mt-1 flex items-start gap-1.5 whitespace-pre-line rounded-lg bg-muted px-2.5 py-2 text-foreground">
            <IconMapPin size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup</span>
              {thread.pickupDetails}
            </span>
          </span>
        ) : (
          "The owner confirmed. Pickup details will appear here when they share them."
        )}
      </Panel>
    );
  if (listing.status === "sold")
    return (
      <Panel icon={<IconCircleCheck size={20} />} title="This item has sold.">
        Thanks for stopping by. The conversation stays here for your records.
      </Panel>
    );
  if (listing.status === "paused")
    return (
      <Panel icon={<IconPlayerPause size={20} />} title="The seller paused this listing.">
        Messages are off for now. Check back later.
      </Panel>
    );
  if (thread?.status === "closed")
    return (
      <Panel icon={<IconClockHour4 size={20} />} title="This conversation is closed.">
        The seller has wrapped it up. Thanks for your interest.
      </Panel>
    );
  return null;
}

export function NoticePanel({
  notice,
  onDismiss,
}: {
  notice: "rate_limited" | "turn_limit" | "offline" | null;
  onDismiss: () => void;
}) {
  if (notice === "turn_limit")
    return (
      <Panel icon={<IconHourglass size={20} />} title="This chat has reached its message limit." tone="warn">
        The seller can see everything you wrote and can still reply here.
      </Panel>
    );
  if (notice === "rate_limited")
    return (
      <Panel icon={<IconClockHour4 size={20} />} title="Lots of messages in a short time." tone="warn">
        <span>
          Wait a few minutes, then try again.{" "}
          <button type="button" onClick={onDismiss} className="font-semibold text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            OK
          </button>
        </span>
      </Panel>
    );
  if (notice === "offline")
    return (
      <Panel icon={<IconWifiOff size={20} />} title="Reconnecting…">
        New replies will show up as soon as the connection is back.
      </Panel>
    );
  return null;
}

export function ThreadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-start gap-3">
        <IconWifiOff size={20} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">We couldn't load the conversation.</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="ml-8">
        <IconRefresh size={15} aria-hidden className={cn(retrying && "animate-spin")} />
        Try again
      </Button>
    </div>
  );
}
