import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowRight, IconPencil } from "@tabler/icons-react";
import { Link } from "react-router";

import { Robot } from "@/components/robot/Robot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { money, type Listing, type ThreadSummary } from "./model";
import { ThreadCard, ThreadCardSkeleton } from "./ThreadCard";
import { useListings, useThreads } from "./use-board";

type Group = { listingId: string; listing: Listing | undefined; threads: ThreadSummary[] };

function groupThreads(threads: ThreadSummary[], listings: Listing[] | undefined): Group[] {
  const groups = new Map<string, Group>();
  for (const t of threads) {
    let g = groups.get(t.listingId);
    if (!g) {
      g = { listingId: t.listingId, listing: listings?.find((l) => l.id === t.listingId), threads: [] };
      groups.set(t.listingId, g);
    }
    g.threads.push(t);
  }
  const latest = (g: Group) => Math.max(...g.threads.map((t) => new Date(t.updatedAt).getTime()));
  return [...groups.values()]
    .map((g) => ({ ...g, threads: [...g.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }))
    .sort((a, b) => latest(b) - latest(a));
}

function ListingGroup({ group }: { group: Group }) {
  const guardrails = useActionQuery("get-guardrails", { listingId: group.listingId });
  const l = group.listing;
  const currency = l?.currency ?? "USD";
  const n = group.threads.length;
  return (
    <section className="flex flex-col gap-3" aria-label={l?.title ?? "Listing"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="min-w-0 truncate text-base font-semibold tracking-[-0.01em]">
          {l ? l.title : <Skeleton className="h-5 w-48" />}
        </h2>
        {l ? (
          <span className="rounded-md bg-tag px-1.5 py-0.5 text-xs font-semibold tabular-nums text-tag-foreground">
            Ask {money(l.askPrice, currency)}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {n === 1 ? "1 conversation" : `${n} conversations`}
        </span>
        {l ? (
          <Link
            to={`/listings/${encodeURIComponent(l.id)}`}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <IconPencil size={14} aria-hidden />
            Guardrails
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
        {group.threads.map((t) => (
          <ThreadCard
            key={t.id}
            thread={t}
            ask={l?.askPrice ?? null}
            currency={currency}
            guardrails={guardrails.data}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyBoard() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Robot character="keeper" state="idle" size={128} />
      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-semibold">Quiet in here.</p>
        <p className="text-sm text-muted-foreground">
          A card shows up the moment a buyer opens one of your listing links and says something, or when you send a
          sparring robot at your own listing. The Keeper does the haggling; you watch, step in, and approve.
        </p>
      </div>
      <Button asChild>
        <Link to="/listings">
          Go to listings
          <IconArrowRight size={16} aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading conversations">
      {[0, 1].map((g) => (
        <div key={g} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
            {[0, 1, 2].map((i) => (
              <ThreadCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardView() {
  const threads = useThreads();
  const listings = useListings();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-6 sm:px-6">
      {threads.isLoading ? (
        <BoardSkeleton />
      ) : threads.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Robot character="keeper" state="thinking" size={96} />
          <p className="text-sm text-muted-foreground">The board did not load. {threads.error.message}</p>
          <Button variant="outline" onClick={() => threads.refetch()}>
            Try again
          </Button>
        </div>
      ) : !threads.data?.length ? (
        <EmptyBoard />
      ) : (
        groupThreads(threads.data, listings.data).map((g) => <ListingGroup key={g.listingId} group={g} />)
      )}
    </div>
  );
}
