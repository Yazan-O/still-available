import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconMessages, IconPhoto, IconPlus } from "@tabler/icons-react";
import { Link } from "react-router";

import { Robot } from "@/components/robot/Robot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { type ListingSummary, money } from "./model";
import { StatusPill } from "./StatusPill";

export function ListingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex justify-end">
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {listing.photoUrl ? (
          <img src={listing.photoUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <IconPhoto className="size-8" stroke={1.4} aria-hidden />
            <span className="text-xs">No photo yet</span>
          </div>
        )}
        <span className="absolute left-3 top-3">
          <StatusPill status={listing.status} />
        </span>
        <span className="absolute bottom-3 right-3 rounded-lg bg-tag px-2.5 py-1 text-sm font-semibold tabular-nums text-tag-foreground shadow-sm">
          {money(listing.askPrice, listing.currency)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug">
          <Link to={`/listings/${listing.id}`} className="outline-none after:absolute after:inset-0">
            {listing.title}
          </Link>
        </h2>
        <div className="mt-auto flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", listing.openThreadCount > 0 ? "bg-tag" : "bg-muted-foreground/40")}
            />
            {listing.openThreadCount === 0
              ? "No open conversations"
              : `${listing.openThreadCount} open conversation${listing.openThreadCount === 1 ? "" : "s"}`}
          </span>
          {listing.threadCount > 0 ? (
            <Link
              to={`/board?listing=${encodeURIComponent(listing.id)}`}
              className="relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-accent"
            >
              <IconMessages className="size-4" stroke={1.8} aria-hidden />
              Board
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-16 text-center">
      <Robot character="keeper" state="idle" size={168} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Nothing for sale yet</h1>
        <p className="text-muted-foreground">
          Add the thing you are selling. The Keeper answers buyers, haggles inside your limits and never says your
          lowest price.
        </p>
      </div>
      <Button asChild size="lg" className="bg-tag text-tag-foreground hover:bg-tag/90">
        <Link to="/listings/new">
          <IconPlus className="size-4" aria-hidden />
          New listing
        </Link>
      </Button>
    </div>
  );
}

export function ListingsPage() {
  const listings = useActionQuery("list-listings", {});
  if (listings.isPending) return <ListingsSkeleton />;
  if (listings.isError)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">
        Could not load your listings. {listings.error instanceof Error ? listings.error.message : ""}
      </div>
    );
  const rows = listings.data ?? [];
  if (rows.length === 0) return <EmptyState />;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex justify-end">
        <Button asChild className="bg-tag text-tag-foreground hover:bg-tag/90">
          <Link to="/listings/new">
            <IconPlus className="size-4" aria-hidden />
            New listing
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
