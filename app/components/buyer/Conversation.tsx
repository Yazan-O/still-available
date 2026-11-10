import type { BuyerOffer, BuyerThread, PublicListing } from "@shared/buyer";
import {
  IconArrowBackUp,
  IconCheck,
  IconHourglass,
  IconMinus,
  IconRefresh,
  IconShieldX,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";

import { Robot, type RobotState } from "@/components/robot/Robot";
import { SpeechBubble } from "@/components/robot/SpeechBubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { money } from "./api";
import type { FeedItem } from "./model";
import type { PendingTurn } from "./useBuyerThread";

const clock = (at: number) =>
  new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function OfferRow({
  amount,
  offer,
  currency,
  pending,
}: {
  amount: number;
  offer?: BuyerOffer;
  currency: string;
  pending?: PendingTurn;
}) {
  const m = (v: number) => money(v, currency);
  let icon = null;
  let result: string;
  let tone = "border-border";
  if (pending) {
    result = pending.status === "failed" ? "Not sent" : "Sending…";
    tone = pending.status === "failed" ? "border-destructive/60" : "border-border border-dashed";
  } else if (offer?.outcome === "deal") {
    icon = <IconCheck size={14} stroke={2.6} aria-hidden className="text-deal" />;
    result = `Deal at ${m(offer.amount)}`;
    tone = "border-deal/70";
  } else if (offer?.outcome === "countered") {
    icon = <IconArrowBackUp size={14} stroke={2.4} aria-hidden className="text-tag" />;
    result = `Keeper countered ${m(offer.counterAmount ?? 0)}`;
    tone = "border-tag/60";
  } else if (offer?.outcome === "refused") {
    icon = <IconShieldX size={14} stroke={2.4} aria-hidden className="text-floor" />;
    result = "Not counted. Offers have to go up.";
    tone = "border-dashed border-floor/70";
  } else if (offer?.outcome === "pending") {
    icon = <IconHourglass size={14} stroke={2.4} aria-hidden className="text-muted-foreground" />;
    result = "Waiting for the owner";
    tone = "border-dashed border-border";
  } else {
    icon = <IconMinus size={14} stroke={2.4} aria-hidden className="text-muted-foreground" />;
    result = "Too low for Keeper";
  }
  return (
    <div className="flex justify-center py-1">
      <div
        className={cn(
          "inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border bg-background px-3 py-1.5 text-xs tabular-nums",
          tone,
        )}
      >
        <span className="font-semibold text-foreground">
          You offered <span className={offer?.outcome === "refused" ? "line-through" : undefined}>{m(amount)}</span>
        </span>
        <span aria-hidden className="text-muted-foreground">·</span>
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          {icon}
          {result}
        </span>
      </div>
    </div>
  );
}

function FailedActions({
  item,
  onRetry,
  onDiscard,
}: {
  item: PendingTurn;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
}) {
  const reason =
    item.error === "network"
      ? "Couldn't reach the server."
      : item.error === "rate_limited"
        ? "Too many messages just now."
        : item.error === "turn_limit"
          ? "This chat is out of messages."
          : item.error === "invalid_request"
            ? "That one didn't go through."
            : "Something went wrong.";
  const canRetry = item.error !== "turn_limit" && item.error !== "invalid_request";
  return (
    <div className="flex items-center justify-end gap-1 text-xs text-destructive">
      <span>{reason}</span>
      {canRetry ? (
        <Button size="xs" variant="ghost" onClick={() => onRetry(item.key)}>
          <IconRefresh size={14} aria-hidden />
          Retry
        </Button>
      ) : null}
      <Button size="xs" variant="ghost" onClick={() => onDiscard(item.key)} aria-label="Remove message">
        <IconTrash size={14} aria-hidden />
      </Button>
    </div>
  );
}

export function Conversation({
  listing,
  thread,
  feed,
  robotState,
  typing,
  onRetry,
  onDiscard,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
  feed: FeedItem[];
  robotState: RobotState;
  typing: boolean;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
}) {
  const lastAgentKey = [...feed]
    .reverse()
    .find((i) => i.type === "message" && i.message.role === "agent")?.key;
  const nameProp = thread?.buyerName ? { name: thread.buyerName } : {};
  return (
    <ol className="flex flex-col gap-3.5" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
      <li>
        <SpeechBubble
          from="robot"
          avatar={<Robot character="keeper" state="idle" size={36} decorative />}
        >
          Hi, I'm Keeper. I answer for the seller of this {listing.title.toLowerCase()}. Ask me
          anything, or make an offer. Flattery is noted but not priced in.
        </SpeechBubble>
      </li>
      {feed.map((item) => {
        if (item.type === "offer")
          return (
            <li key={item.key}>
              <OfferRow amount={item.offer.amount} offer={item.offer} currency={listing.currency} />
            </li>
          );
        if (item.type === "pending") {
          const p = item.pending;
          if (p.kind === "offer")
            return (
              <li key={item.key} className="flex flex-col gap-1">
                <OfferRow amount={p.amount ?? 0} pending={p} currency={listing.currency} />
                {p.status === "failed" ? (
                  <div className="flex justify-center">
                    <FailedActions item={p} onRetry={onRetry} onDiscard={onDiscard} />
                  </div>
                ) : null}
              </li>
            );
          return (
            <li key={item.key} className="flex flex-col gap-1">
              <SpeechBubble
                from="buyer"
                {...nameProp}
                meta={p.status === "failed" ? null : p.status === "sending" ? "Sending…" : "Queued"}
                className={cn(p.status !== "failed" && "opacity-80")}
              >
                <span className="whitespace-pre-wrap break-words">{p.text}</span>
              </SpeechBubble>
              {p.status === "failed" ? (
                <FailedActions item={p} onRetry={onRetry} onDiscard={onDiscard} />
              ) : null}
            </li>
          );
        }
        const msg = item.message;
        if (msg.role === "system")
          return (
            <li key={item.key}>
              <SpeechBubble from="system">{msg.text}</SpeechBubble>
            </li>
          );
        if (msg.role === "seller")
          return (
            <li key={item.key}>
              <SpeechBubble
                from="seller"
                name="The owner"
                meta={clock(item.at)}
                avatar={
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-border">
                    <IconUser size={18} aria-hidden />
                  </span>
                }
              >
                <span className="whitespace-pre-wrap break-words">{msg.text}</span>
              </SpeechBubble>
            </li>
          );
        if (msg.role === "agent")
          return (
            <li key={item.key}>
              <SpeechBubble
                from="robot"
                meta={clock(item.at)}
                avatar={
                  <Robot
                    character="keeper"
                    state={item.key === lastAgentKey && robotState === "talking" ? "talking" : "idle"}
                    size={36}
                    decorative
                  />
                }
              >
                <span className="whitespace-pre-wrap break-words">{msg.text}</span>
              </SpeechBubble>
            </li>
          );
        return (
          <li key={item.key}>
            <SpeechBubble from="buyer" {...nameProp} meta={clock(item.at)}>
              <span className="whitespace-pre-wrap break-words">{msg.text}</span>
            </SpeechBubble>
          </li>
        );
      })}
      {typing ? (
        <li>
          <SpeechBubble
            from="robot"
            typing
            avatar={<Robot character="keeper" state="thinking" size={36} decorative />}
          />
        </li>
      ) : null}
    </ol>
  );
}
