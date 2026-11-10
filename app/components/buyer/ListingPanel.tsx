import type { PublicListing } from "@shared/buyer";
import {
  IconArmchair,
  IconBike,
  IconBook,
  IconCamera,
  IconChevronDown,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDeviceTv,
  IconGuitarPick,
  IconHeadphones,
  IconLamp,
  IconPackage,
  IconPlant,
  IconShirt,
  IconShoe,
  IconTable,
  IconToolsKitchen2,
  type Icon,
} from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { money } from "./api";

const ITEM_ICONS: [RegExp, Icon][] = [
  [/(lamps?|light|lantern|sconce|chandelier)/i, IconLamp],
  [/(chairs?|armchair|sofa|couch|loveseat|recliner|ottoman)/i, IconArmchair],
  [/(tables?|desk|stool|dresser|shelf|shelves|cabinet|bench|nightstand)/i, IconTable],
  [/(bikes?|bicycle|scooter)/i, IconBike],
  [/(books?|novel|comics?|vinyl|records?)/i, IconBook],
  [/(cameras?|lens|tripod)/i, IconCamera],
  [/(guitar|bass|ukulele|piano|keyboard|amp|drums?|violin)/i, IconGuitarPick],
  [/(headphones|speakers?|turntable|stereo|earbuds)/i, IconHeadphones],
  [/(tv|television|monitor|projector)/i, IconDeviceTv],
  [/(laptop|computer|macbook|pc|tablet|ipad)/i, IconDeviceLaptop],
  [/(phone|iphone|smartphone)/i, IconDeviceMobile],
  [/(shoes?|sneakers?|boots?|heels)/i, IconShoe],
  [/(shirt|jacket|coat|dress|sweater|hoodie|jeans)/i, IconShirt],
  [/(plants?|planter|pot|succulent)/i, IconPlant],
  [/(pan|pot|kettle|mixer|blender|kitchen|knife|knives|dishes|mugs?)/i, IconToolsKitchen2],
];

function itemIcon(title: string): Icon {
  return ITEM_ICONS.find(([re]) => re.test(title))?.[1] ?? IconPackage;
}

export function ListingPhoto({
  listing,
  className,
  size = "large",
}: {
  listing: PublicListing;
  className?: string;
  size?: "thumb" | "large";
}) {
  const [broken, setBroken] = useState(false);
  if (listing.photoUrl && !broken) {
    return (
      <img
        src={listing.photoUrl}
        alt={listing.title}
        onError={() => setBroken(true)}
        className={cn("bg-muted object-cover", className)}
      />
    );
  }
  const ItemIcon = itemIcon(listing.title);
  return (
    <div
      role="img"
      aria-label={`${listing.title}, no photo yet`}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,hsl(var(--card))_0%,hsl(var(--accent))_100%)] text-accent-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]"
      />
      {size === "thumb" ? (
        <ItemIcon className="relative size-7" stroke={1.4} aria-hidden />
      ) : (
        <>
          <span className="relative flex size-20 items-center justify-center rounded-full bg-card/80 shadow-[0_1px_0_hsl(var(--border)),0_8px_24px_-12px_hsl(var(--accent-foreground)/0.35)] ring-1 ring-border">
            <ItemIcon className="size-10" stroke={1.3} aria-hidden />
          </span>
          <span className="relative mt-3 text-xs font-medium tracking-wide text-accent-foreground/70">
            Photo on request. Keeper can describe it.
          </span>
        </>
      )}
    </div>
  );
}

function PriceTag({ listing, className, label = true }: { listing: PublicListing; className?: string; label?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-md bg-tag px-2 py-0.5 font-semibold tabular-nums text-tag-foreground",
        className,
      )}
      aria-label={label ? undefined : `Asking ${money(listing.askPrice, listing.currency)}`}
    >
      {label ? <span className="text-[0.7em] font-medium uppercase tracking-wide opacity-85">Asking</span> : null}
      {money(listing.askPrice, listing.currency)}
    </span>
  );
}

function StatusChip({ status }: { status: PublicListing["status"] }) {
  if (status === "live") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {status === "sold" ? "Sold" : "Paused"}
    </span>
  );
}

function Facts({ facts }: { facts: string[] }) {
  if (!facts.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Details">
      {facts.map((f, i) => (
        <li
          key={`${i}-${f}`}
          className="max-w-full rounded-full border border-border bg-background px-2.5 py-1.5 text-xs leading-tight text-foreground/85"
        >
          {f}
        </li>
      ))}
    </ul>
  );
}

function Description({ text }: { text: string }) {
  if (!text) return null;
  return <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

export function ListingCompact({ listing }: { listing: PublicListing }) {
  const [open, setOpen] = useState(false);
  const hasMore = listing.facts.length > 0 || !!listing.description;
  return (
    <section aria-label="Listing" className="overflow-hidden rounded-2xl border border-border bg-card lg:hidden">
      <div className="relative flex items-center gap-3 p-2 pr-3">
        <ListingPhoto
          listing={listing}
          size="thumb"
          className="size-14 shrink-0 overflow-hidden rounded-xl border border-border"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug tracking-[-0.01em]">{listing.title}</h1>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="listing-details"
              className="inline-flex w-fit items-center gap-0.5 rounded text-xs font-medium text-muted-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {open ? "Hide details" : "Details"}
              <IconChevronDown
                size={14}
                aria-hidden
                className={cn("transition-transform duration-200", open && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PriceTag listing={listing} label={false} className="text-base" />
          <StatusChip status={listing.status} />
        </div>
      </div>
      {open ? (
        <div id="listing-details" className="flex flex-col gap-2.5 border-t border-border px-3 pb-3 pt-3">
          <Facts facts={listing.facts} />
          <Description text={listing.description} />
        </div>
      ) : null}
    </section>
  );
}

export function ListingFull({ listing }: { listing: PublicListing }) {
  return (
    <section
      aria-label="Listing"
      className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block"
    >
      <ListingPhoto listing={listing} className="aspect-[2/1] w-full border-b border-border" />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-balance">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <PriceTag listing={listing} className="text-lg" />
            <StatusChip status={listing.status} />
          </div>
        </div>
        <Facts facts={listing.facts} />
        <Description text={listing.description} />
      </div>
    </section>
  );
}
