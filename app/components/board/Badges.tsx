import { IconHandStop, IconKey, IconShieldX, IconUserBolt } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { STATUS_LABEL, type SellerThread } from "./model";

const STATUS_TONE: Record<SellerThread["status"], string> = {
  open: "border-border bg-card text-muted-foreground",
  deal_pending: "border-tag bg-tag text-tag-foreground",
  deal: "border-deal bg-deal text-primary-foreground",
  closed: "border-border bg-muted text-muted-foreground",
};

export function StatusChip({ status, className }: { status: SellerThread["status"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-semibold",
        STATUS_TONE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ApprovalBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent px-2 text-[11px] font-semibold text-accent-foreground">
      <IconHandStop size={13} stroke={2.2} aria-hidden />
      {count === 1 ? "1 offer needs you" : `${count} offers need you`}
    </span>
  );
}

export function PickupBadge({ waiting }: { waiting: boolean }) {
  if (!waiting) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent px-2 text-[11px] font-semibold text-accent-foreground">
      <IconKey size={13} stroke={2.2} aria-hidden />
      Pickup not sent
    </span>
  );
}

export function BlockedBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-floor px-2 text-[11px] font-semibold text-floor">
      <IconShieldX size={13} stroke={2.2} aria-hidden />
      {count === 1 ? "1 attack blocked" : `${count} attacks blocked`}
    </span>
  );
}

export function TakenOverBadge({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary px-2 text-[11px] font-semibold text-secondary-foreground">
      <IconUserBolt size={13} stroke={2.2} aria-hidden />
      You are typing
    </span>
  );
}
