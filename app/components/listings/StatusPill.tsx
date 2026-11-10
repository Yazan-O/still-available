import { cn } from "@/lib/utils";

import type { ListingStatus } from "./model";

const STYLE: Record<ListingStatus, string> = {
  draft: "bg-card/90 text-muted-foreground ring-border",
  live: "bg-primary text-primary-foreground ring-primary",
  paused: "bg-card/90 text-foreground ring-border",
  sold: "bg-foreground text-background ring-foreground",
};

const LABEL: Record<ListingStatus, string> = { draft: "Draft", live: "Live", paused: "Paused", sold: "Sold" };

export function StatusPill({ status, className }: { status: ListingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 backdrop-blur",
        STYLE[status],
        className,
      )}
    >
      {status === "live" ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {LABEL[status]}
    </span>
  );
}
