import { IconCheck, IconHandStop, IconKey, IconX } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { buyerLabel, money, type Guardrails, type ThreadDetail, type ThreadOffer } from "./model";
import type { useBoardMutations } from "./use-board";

type Mutations = ReturnType<typeof useBoardMutations>;

function NeedsYou({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-tag/70 bg-card p-4" aria-label={title}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </span>
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ApprovalCard({
  offer,
  detail,
  currency,
  guardrails,
  m,
}: {
  offer: ThreadOffer;
  detail: ThreadDetail;
  currency: string;
  guardrails: Guardrails | undefined;
  m: Mutations;
}) {
  const name = buyerLabel(detail.thread);
  const open = detail.thread.status === "open";
  const busy = m.reviewOffer.isPending;
  const robot =
    offer.outcome === "countered" && offer.counterAmount !== null
      ? `The Keeper countered at ${money(offer.counterAmount, currency)}.`
      : "The Keeper is out of counters.";
  const why = guardrails
    ? `Above your floor of ${money(guardrails.floorPrice, currency)}, under the Keeper's limit of ${money(guardrails.robotLimitPrice, currency)}.`
    : "Above your floor, under the Keeper's limit.";
  return (
    <NeedsYou icon={<IconHandStop size={16} aria-hidden />} title={`${name} offered ${money(offer.amount, currency)}`}>
      <p className="text-sm text-muted-foreground">
        {why} {robot} Only you can take it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-tag text-tag-foreground hover:bg-tag/90"
          disabled={!open || busy}
          onClick={() => m.reviewOffer.mutate({ offerId: offer.id, decision: "approve" })}
        >
          <IconCheck size={16} aria-hidden />
          Approve {money(offer.amount, currency)}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => m.reviewOffer.mutate({ offerId: offer.id, decision: "decline" })}
        >
          <IconX size={16} aria-hidden />
          Decline
        </Button>
      </div>
      {!open ? <p className="text-xs text-muted-foreground">This conversation already has a deal.</p> : null}
    </NeedsYou>
  );
}

function ConfirmDealCard({ detail, currency, m }: { detail: ThreadDetail; currency: string; m: Mutations }) {
  const amount = detail.thread.agreedPrice;
  if (amount === null) return null;
  return (
    <NeedsYou icon={<IconCheck size={16} aria-hidden />} title={`Deal at ${money(amount, currency)}. Confirm it?`}>
      <p className="text-sm text-muted-foreground">
        {buyerLabel(detail.thread)} agreed. Confirming closes the deal and stops new offers.
      </p>
      <Button
        className="self-start bg-tag text-tag-foreground hover:bg-tag/90"
        disabled={m.closeDeal.isPending}
        onClick={() => m.closeDeal.mutate({ threadId: detail.thread.id, amount })}
      >
        Confirm deal at {money(amount, currency)}
      </Button>
    </NeedsYou>
  );
}

function ReleasePickupCard({
  detail,
  currency,
  guardrails,
  listingId,
  m,
}: {
  detail: ThreadDetail;
  currency: string;
  guardrails: Guardrails | undefined;
  listingId: string;
  m: Mutations;
}) {
  const [open, setOpen] = useState(false);
  const name = buyerLabel(detail.thread);
  const pickup = guardrails?.pickupDetails?.trim() ?? "";
  return (
    <NeedsYou
      icon={<IconKey size={16} aria-hidden />}
      title={`Sold at ${money(detail.thread.agreedPrice, currency)}. Send pickup details?`}
    >
      <p className="text-sm text-muted-foreground">
        {name} cannot see where or when to pick up until you release it.
      </p>
      <Button className="self-start" disabled={m.releasePickup.isPending} onClick={() => setOpen(true)}>
        <IconKey size={16} aria-hidden />
        Release pickup
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Show pickup details to {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pickup ? "They will see exactly this, and it cannot be taken back:" : "You have no pickup details saved for this listing."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pickup ? (
            <blockquote className="whitespace-pre-wrap rounded-lg border border-border bg-muted px-3 py-2 text-sm">{pickup}</blockquote>
          ) : guardrails ? (
            <Link to={`/listings/${encodeURIComponent(listingId)}`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
              Add pickup details in the listing's guardrails
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Loading pickup details...</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pickup}
              onClick={() => m.releasePickup.mutate({ threadId: detail.thread.id })}
            >
              Release to {name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NeedsYou>
  );
}

export function ActionCards({
  detail,
  currency,
  guardrails,
  m,
}: {
  detail: ThreadDetail;
  currency: string;
  guardrails: Guardrails | undefined;
  m: Mutations;
}) {
  const cards = detail.offers.filter((o) => o.approvalCard && o.review === "pending");
  const t = detail.thread;
  const nodes: ReactNode[] = cards.map((o) => (
    <ApprovalCard key={o.id} offer={o} detail={detail} currency={currency} guardrails={guardrails} m={m} />
  ));
  if (t.status === "deal_pending") nodes.push(<ConfirmDealCard key="confirm" detail={detail} currency={currency} m={m} />);
  if (t.status === "deal" && !t.pickupReleased) {
    nodes.push(
      <ReleasePickupCard key="pickup" detail={detail} currency={currency} guardrails={guardrails} listingId={t.listingId} m={m} />,
    );
  }
  if (!nodes.length) return null;
  return <div className="flex flex-col gap-3">{nodes}</div>;
}
