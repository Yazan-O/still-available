import { MAX_OFFERS, type BuyerThread, type PublicListing } from "@shared/buyer";

import { OfferLadder } from "@/components/robot/OfferLadder";
import { Robot, type RobotState } from "@/components/robot/Robot";
import { cn } from "@/lib/utils";

import { money } from "./api";
import { laddersFrom, stageLine } from "./model";

function OffersLeft({ left }: { left: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${left} of ${MAX_OFFERS} offers left`}>
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: MAX_OFFERS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-3 rounded-full",
              i < left ? "bg-tag" : "bg-border",
            )}
          />
        ))}
      </span>
      <span className="tabular-nums">
        {left === 0 ? "No offers left" : `${left} ${left === 1 ? "offer" : "offers"} left`}
      </span>
    </span>
  );
}

export function KeeperStage({
  listing,
  thread,
  state,
  className,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
  state: RobotState;
  className?: string;
}) {
  const left = thread?.offersLeft ?? MAX_OFFERS;
  const counter = thread?.currentCounter ?? null;
  return (
    <section
      aria-label="The seller's robot"
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 sm:gap-5 sm:px-5 lg:py-3.5",
        className,
      )}
    >
      <div className="relative -my-1 shrink-0 lg:hidden">
        <Robot character="keeper" state={state} size={60} />
      </div>
      <div className="relative -my-1 hidden shrink-0 lg:block">
        <Robot character="keeper" state={state} size={92} decorative />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold">Keeper</span>
          <span className="truncate text-xs text-muted-foreground">the seller's robot</span>
        </div>
        <p className="text-sm leading-snug text-foreground/90 lg:text-[0.95rem]" aria-live="polite">
          {stageLine(state, thread, listing)}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
          {counter !== null && thread?.status === "open" ? (
            <span className="tabular-nums">
              Counter <span className="font-semibold text-foreground">{money(counter, listing.currency)}</span>
            </span>
          ) : null}
          <OffersLeft left={left} />
        </div>
      </div>
    </section>
  );
}

export function LadderCard({
  listing,
  thread,
  className,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
  className?: string;
}) {
  const { counters, offers } = laddersFrom(thread);
  return (
    <section
      aria-label="Price ladder"
      className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4", className)}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Price ladder
      </h2>
      {offers.length ? (
        <OfferLadder
          ask={listing.askPrice}
          counters={counters}
          offers={offers}
          currency={listing.currency}
          height={180}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Your offers and Keeper's counters land here. You get {MAX_OFFERS}, and each one has to beat the last.
        </p>
      )}
    </section>
  );
}

export function KeeperMini({
  listing,
  thread,
  state,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
  state: RobotState;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <Robot character="keeper" state={state} size={34} decorative />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">Keeper</span>{" "}
        <span className="text-muted-foreground">{stageLine(state, thread, listing)}</span>
      </p>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {money(thread?.agreedPrice ?? thread?.currentCounter ?? listing.askPrice, listing.currency)}
      </span>
    </div>
  );
}
