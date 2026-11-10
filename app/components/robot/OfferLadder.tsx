import {
  IconArrowBackUp,
  IconCheck,
  IconLock,
  IconMinus,
  IconShieldX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Robot } from "./Robot";

export type OfferOutcome =
  | "deal"
  | "countered"
  | "passed"
  | "pending"
  | "refused";

export interface OfferLadderProps {
  ask: number;
  counters: number[];
  offers: { amount: number; outcome: OfferOutcome }[];
  floor?: number;
  robotLimit?: number;
  currency: string;
  height?: number;
  className?: string;
}

type Side = "robot" | "buyer";
interface Mark {
  key: string;
  side: Side;
  value: number;
  y: number;
  ly: number;
  node: ReactNode;
  tick: "ask" | "counter" | "now" | "floor" | "limit" | OfferOutcome;
}

const LABEL_GAP = 24;
const PAD = 14;
const TOP = 30;

function spread(marks: Mark[], height: number) {
  const s = [...marks].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const m of s) {
    m.ly = Math.max(m.y, TOP - 8, prev + LABEL_GAP);
    prev = m.ly;
  }
  let next = Infinity;
  for (const m of [...s].reverse()) {
    m.ly = Math.max(Math.min(m.ly, height - PAD, next - LABEL_GAP), TOP - 8);
    next = m.ly;
  }
}

const OUTCOME: Record<
  OfferOutcome,
  { label: string; icon: typeof IconCheck; chip: string; dot: string }
> = {
  deal: {
    label: "deal",
    icon: IconCheck,
    chip: "bg-deal text-primary-foreground border-deal",
    dot: "bg-deal",
  },
  countered: {
    label: "countered",
    icon: IconArrowBackUp,
    chip: "border-tag text-foreground bg-card",
    dot: "bg-tag",
  },
  passed: {
    label: "passed",
    icon: IconMinus,
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  pending: {
    label: "waiting for the owner",
    icon: IconMinus,
    chip: "border-dashed border-tag bg-card text-foreground",
    dot: "bg-tag",
  },
  refused: {
    label: "refused",
    icon: IconShieldX,
    chip: "border-dashed border-floor text-floor bg-card",
    dot: "bg-floor",
  },
};

export function OfferLadder({
  ask,
  counters,
  offers,
  floor,
  robotLimit,
  currency,
  height = 240,
  className,
}: OfferLadderProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    }).format(v);

  const values = [
    ask,
    ...counters,
    ...offers.map((o) => o.amount),
    ...(floor === undefined ? [] : [floor]),
    ...(robotLimit === undefined ? [] : [robotLimit]),
  ];
  const hi = Math.max(...values);
  const inRange = values.filter((v) => v >= hi * 0.5);
  const hasOutlier = inRange.length < values.length;
  const rawLo = Math.min(...inRange);
  const lo = hi === rawLo ? hi * 0.8 : rawLo - (hi - rawLo) * 0.06;
  const bottom = height - PAD - (hasOutlier ? 26 : 0);
  const y = (v: number) =>
    v < lo ? height - PAD : TOP + ((hi - v) / (hi - lo)) * (bottom - TOP);

  const deal = offers.find((o) => o.outcome === "deal");
  const lastCounter = counters[counters.length - 1];
  const now = deal?.amount ?? lastCounter ?? ask;
  const nowLabel = deal ? "Deal" : lastCounter !== undefined ? "Robot now" : "Robot holds ask";

  const marks: Mark[] = [];
  const add = (m: Omit<Mark, "y" | "ly">) =>
    marks.push({ ...m, y: y(m.value), ly: 0 });

  add({
    key: "ask",
    side: "robot",
    value: ask,
    tick: "ask",
    node: (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-tag px-1.5 py-0.5 text-xs font-semibold text-tag-foreground">
        Ask {fmt(ask)}
      </span>
    ),
  });
  counters.forEach((c, i) => {
    const last = i === counters.length - 1 && !deal;
    add({
      key: `c${i}`,
      side: "robot",
      value: c,
      tick: last ? "now" : "counter",
      node: last ? (
        <span className="text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Counter </span>
          {fmt(c)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          Counter {fmt(c)}
        </span>
      ),
    });
  });
  if (robotLimit !== undefined)
    add({
      key: "limit",
      side: "robot",
      value: robotLimit,
      tick: "limit",
      node: (
        <span className="text-xs font-medium text-primary">
          Robot limit {fmt(robotLimit)}
        </span>
      ),
    });
  if (floor !== undefined)
    add({
      key: "floor",
      side: "robot",
      value: floor,
      tick: "floor",
      node: (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-floor">
          <IconLock size={12} stroke={2.4} aria-hidden />
          Floor {fmt(floor)}
        </span>
      ),
    });
  offers.forEach((o, i) => {
    const s = OUTCOME[o.outcome];
    const Icon = s.icon;
    add({
      key: `o${i}`,
      side: "buyer",
      value: o.amount,
      tick: o.outcome,
      node: (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
            s.chip,
          )}
          aria-label={`Buyer offer ${fmt(o.amount)}, ${s.label}`}
        >
          <Icon size={12} stroke={2.6} aria-hidden />
          <span className={o.outcome === "refused" ? "line-through" : undefined}>
            {fmt(o.amount)}
          </span>
        </span>
      ),
    });
  });

  spread(marks.filter((m) => m.side === "robot"), height);
  spread(marks.filter((m) => m.side === "buyer"), height);

  const nowY = y(now);
  const bandTop = y(ask);
  const bandBottom = floor !== undefined ? y(floor) : undefined;

  return (
    <div
      role="group"
      aria-label={`Offer ladder: ask ${fmt(ask)}, ${nowLabel.toLowerCase()} ${fmt(now)}, ${offers.length} buyer offers`}
      className={cn("relative w-full select-none tabular-nums", className)}
      style={{ height }}
    >
      <div className="absolute inset-x-0 -top-0.5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span>Robot</span>
        <span>Buyer</span>
      </div>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {bandBottom !== undefined ? (
          <svg x="50%" y={bandTop} overflow="visible">
            <rect
              x={-5}
              width="10"
              height={Math.max(bandBottom - bandTop, 0)}
              rx="5"
              className="fill-deal/20"
            />
          </svg>
        ) : null}
        <line
          x1="50%"
          x2="50%"
          y1={TOP - 8}
          y2={height - PAD}
          className="stroke-border"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {floor !== undefined ? (
          <line
            x1="40%"
            x2="60%"
            y1={y(floor)}
            y2={y(floor)}
            className="stroke-floor"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        ) : null}
        {robotLimit !== undefined ? (
          <line
            x1="42%"
            x2="58%"
            y1={y(robotLimit)}
            y2={y(robotLimit)}
            className="stroke-primary"
            strokeWidth="1.5"
            strokeDasharray="1.5 4"
            strokeLinecap="round"
          />
        ) : null}
        {marks
          .filter((m) => Math.abs(m.ly - m.y) > 1 || (m.tick !== "floor" && m.tick !== "limit"))
          .map((m) => (
            <line
              key={`l-${m.key}`}
              x1={m.side === "robot" ? "41%" : "59%"}
              x2={m.side === "robot" ? (m.tick === "floor" || m.tick === "limit" ? "42%" : "48%") : "52%"}
              y1={m.ly}
              y2={m.y}
              className="stroke-muted-foreground/40"
              strokeWidth="1"
            />
          ))}
        {hasOutlier ? (
          <svg x="50%" y={bottom + 13} overflow="visible">
            <rect x={-7} y={-4} width={14} height={8} className="fill-card" />
            <line x1={-7} x2={7} y1={-2} y2={-6} className="stroke-muted-foreground" strokeWidth="1.5" />
            <line x1={-7} x2={7} y1={6} y2={2} className="stroke-muted-foreground" strokeWidth="1.5" />
          </svg>
        ) : null}
      </svg>
      {marks.map((m) =>
        m.tick === "floor" || m.tick === "limit" ? null : (
          <span
            key={`t-${m.key}`}
            aria-hidden
            className={cn(
              "absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
              m.tick === "ask" && "rounded-[3px] bg-tag",
              (m.tick === "counter" || m.tick === "now") && "bg-bot-keeper",
              m.side === "buyer" && OUTCOME[m.tick as OfferOutcome].dot,
            )}
            style={{
              top: m.y,
              left: m.side === "robot" ? "calc(50% - 4px)" : "calc(50% + 4px)",
            }}
          />
        ),
      )}
      {marks.map((m) => (
        <div
          key={`n-${m.key}`}
          className={cn(
            "absolute flex -translate-y-1/2 whitespace-nowrap",
            m.side === "robot" ? "right-[60%] justify-end" : "left-[60%] justify-start",
          )}
          style={{ top: m.ly }}
        >
          {m.node}
        </div>
      ))}
      <div
        className="absolute -translate-x-1/2 -translate-y-[78%]"
        style={{ top: nowY, left: "50%" }}
        title={`${nowLabel}: ${fmt(now)}`}
      >
        <Robot character="keeper" state="idle" size={30} decorative />
      </div>
      <span className="sr-only">
        {nowLabel} {fmt(now)}.
        {floor !== undefined ? ` Floor ${fmt(floor)}.` : ""}
        {offers.map((o) => ` Offer ${fmt(o.amount)} ${OUTCOME[o.outcome].label}.`).join("")}
      </span>
    </div>
  );
}
