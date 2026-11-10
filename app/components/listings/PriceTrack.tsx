import { IconLock, IconTag } from "@tabler/icons-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { Robot } from "@/components/robot/Robot";
import { cn } from "@/lib/utils";

import { money } from "./model";

export type Prices = { ask: number; limit: number; floor: number };
type Key = keyof Prices;

function domainFor({ ask, floor }: Prices): [number, number] {
  const a = Math.max(ask, 1);
  const f = Math.min(Math.max(floor, 0), a);
  const spread = Math.max(a - f, a * 0.25, 4);
  const lo = Math.max(0, Math.floor(f - spread * 0.7));
  const hi = Math.ceil(a + (a - lo) * 0.12 + 1);
  return [lo, hi];
}

export function PriceTrack({
  value,
  onChange,
  currency = "USD",
  invalid = false,
}: {
  value: Prices;
  onChange: (next: Prices) => void;
  currency?: string;
  invalid?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: Key; domain: [number, number] } | null>(null);
  const [lo, hi] = drag?.domain ?? domainFor(value);
  const step = value.ask >= 1000 ? 10 : value.ask >= 300 ? 5 : 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`;
  const num = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));

  function bounds(key: Key, v: Prices): [number, number] {
    if (key === "floor") return [1, v.limit];
    if (key === "limit") return [Math.max(1, v.floor), v.ask];
    return [Math.max(1, v.limit), Math.max(v.limit, hi)];
  }

  function set(key: Key, raw: number) {
    const [min, max] = bounds(key, value);
    const next = Math.min(max, Math.max(min, Math.round(raw / step) * step || min));
    if (next !== value[key]) onChange({ ...value, [key]: next });
  }

  function fromPointer(e: PointerEvent, key: Key, domain: [number, number]) {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    const t = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    set(key, domain[0] + t * (domain[1] - domain[0]));
  }

  function handleProps(key: Key, label: string) {
    const [min, max] = bounds(key, value);
    return {
      role: "slider",
      tabIndex: 0,
      "aria-label": label,
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": value[key],
      "aria-valuetext": money(value[key], currency),
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus();
        setDrag({ key, domain: [lo, hi] });
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (drag?.key === key) fromPointer(e, key, drag.domain);
      },
      onPointerUp: () => setDrag(null),
      onPointerCancel: () => setDrag(null),
      onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
        const d = e.shiftKey ? step * 10 : step;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") set(key, value[key] + d);
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(key, value[key] - d);
        else if (e.key === "Home") set(key, min);
        else if (e.key === "End") set(key, max);
        else return;
        e.preventDefault();
      },
    } as const;
  }

  const closeTop = Math.abs(num(value.ask) - num(value.limit)) < 34;
  const edge = (v: number): Edge => (num(v) > 82 ? "end" : num(v) < 18 ? "start" : "center");

  return (
    <div className="select-none pt-16 pb-12" aria-describedby="price-track-legend">
      <div ref={track} className="relative h-3 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-floor/15 bg-[repeating-linear-gradient(135deg,transparent_0_5px,hsl(var(--floor)/0.18)_5px_7px)]"
          style={{ width: pct(value.floor) }}
        />
        <div
          className="absolute inset-y-0 bg-tag/45"
          style={{ left: pct(value.floor), width: `calc(${pct(value.limit)} - ${pct(value.floor)})` }}
        />
        <div
          className="absolute inset-y-0 bg-bot-keeper/55"
          style={{ left: pct(value.limit), width: `calc(${pct(value.ask)} - ${pct(value.limit)})` }}
        />

        <Handle
          at={pct(value.ask)}
          active={drag?.key === "ask"}
          className="z-30"
          flag={
            <Flag side="top" tone="ask" edge={edge(value.ask)}>
              Asking {money(value.ask, currency)}
            </Flag>
          }
          {...handleProps("ask", "Asking price")}
        >
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-[color:var(--bot-ink)] bg-tag text-tag-foreground shadow-sm">
            <IconTag className="size-4" stroke={2.4} aria-hidden />
          </span>
        </Handle>

        <Handle
          at={pct(value.limit)}
          active={drag?.key === "limit"}
          className="z-20"
          flag={
            <Flag side="top" tone="limit" lift={closeTop} edge={edge(value.limit)}>
              Robot {money(value.limit, currency)}
            </Flag>
          }
          {...handleProps("limit", "Robot limit: the lowest price the robot can agree to on its own")}
        >
          <span className="block rounded-full bg-card p-0.5 shadow-sm ring-2 ring-bot-keeper">
            <Robot character="keeper" state={drag?.key === "limit" ? "holding" : "idle"} size={30} decorative />
          </span>
        </Handle>

        <Handle
          at={pct(value.floor)}
          active={drag?.key === "floor"}
          className="z-10"
          flag={
            <Flag side="bottom" tone="floor" invalid={invalid} edge={edge(value.floor)}>
              <IconLock className="size-3" stroke={2.4} aria-hidden />
              Floor {money(value.floor, currency)}
            </Flag>
          }
          {...handleProps("floor", "Your floor: the lowest price you would ever take. Secret.")}
        >
          <span className="flex size-6 items-center justify-center rounded-full border-2 border-[color:var(--bot-ink)] bg-floor text-white shadow-sm">
            <IconLock className="size-3.5" stroke={2.6} aria-hidden />
          </span>
        </Handle>
      </div>
      <div className="relative mt-2 h-4 text-[11px] tabular-nums text-muted-foreground" aria-hidden>
        <span className="absolute left-0">{money(lo, currency)}</span>
        <span className="absolute right-0">{money(hi, currency)}</span>
      </div>
    </div>
  );
}

function Handle({
  at,
  active,
  flag,
  children,
  className,
  ...rest
}: {
  at: string;
  active: boolean;
  flag: ReactNode;
  children: ReactNode;
  className?: string;
} & Record<string, unknown>) {
  return (
    <div
      {...rest}
      className={cn(
        "absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "scale-110 cursor-grabbing" : "hover:scale-105",
        className,
      )}
      style={{ left: at }}
    >
      {children}
      {flag}
    </div>
  );
}

type Edge = "start" | "center" | "end";

function Flag({
  side,
  tone,
  edge = "center",
  lift = false,
  invalid = false,
  children,
}: {
  side: "top" | "bottom";
  tone: "ask" | "limit" | "floor";
  edge?: Edge;
  lift?: boolean;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums shadow-sm",
        edge === "center" && "left-1/2 -translate-x-1/2",
        edge === "start" && "left-0",
        edge === "end" && "right-0",
        side === "top" ? (lift ? "bottom-[calc(100%+30px)]" : "bottom-[calc(100%+6px)]") : "top-[calc(100%+6px)]",
        tone === "ask" && "bg-tag text-tag-foreground",
        tone === "limit" && "bg-card text-primary ring-1 ring-bot-keeper",
        tone === "floor" && "bg-card text-floor ring-1 ring-floor",
        invalid && "bg-floor text-white",
      )}
    >
      {children}
    </span>
  );
}
