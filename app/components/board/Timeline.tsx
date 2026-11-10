import { useState } from "react";

import { Robot } from "@/components/robot/Robot";
import { CHARACTERS } from "@/components/robot/characters";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  attackerOf,
  blockedLine,
  buyerLabel,
  clock,
  detailString,
  money,
  type ThreadDetail,
  type ThreadEvent,
} from "./model";

type ActorKey = "buyer" | "robot" | "seller" | "system";

function actorKey(actor: string): ActorKey {
  if (actor === "agent") return "robot";
  if (actor === "seller") return "seller";
  if (actor === "system") return "system";
  return "buyer";
}

const ACTOR_STYLE: Record<ActorKey, string> = {
  buyer: "bg-foreground text-background",
  robot: "bg-bot-keeper text-white",
  seller: "bg-tag text-tag-foreground",
  system: "bg-muted text-muted-foreground border border-border",
};

function ActorBadge({ actor, detail }: { actor: string; detail: ThreadDetail }) {
  const key = actorKey(actor);
  const attacker = attackerOf(detail.thread);
  const label =
    key === "robot" ? "Keeper" : key === "seller" ? "You" : key === "system" ? "System" : buyerLabel(detail.thread);
  const style =
    key === "buyer" && attacker ? { background: CHARACTERS[attacker].color, color: attacker === "jailbreaker" ? "#ffffff" : "#1d1a16" } : undefined;
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-[7.5rem] shrink-0 items-center truncate rounded-full px-2 text-[10px] font-semibold",
        ACTOR_STYLE[key],
      )}
      style={style}
      title={key === "buyer" ? "buyer" : key}
    >
      {label}
    </span>
  );
}

function num(detail: unknown, key: string) {
  const v = detail && typeof detail === "object" ? (detail as Record<string, unknown>)[key] : undefined;
  return typeof v === "number" ? v : null;
}

function describe(e: ThreadEvent, d: ThreadDetail, currency: string) {
  const offerAmount = () => {
    const id = detailString(e.detail, "offerId");
    return d.offers.find((o) => o.id === id)?.amount ?? null;
  };
  switch (e.type) {
    case "message":
      return "Wrote a message";
    case "offer": {
      const outcome = detailString(e.detail, "outcome");
      const verdict = outcome === "deal" ? "a deal" : outcome === "passed" ? "passed" : "countered";
      return `Offered ${money(num(e.detail, "amount"), currency)}, ${verdict}`;
    }
    case "counter":
      return `Countered at ${money(num(e.detail, "counterAmount"), currency)}`;
    case "blocked_attempt":
      return blockedLine(e, currency);
    case "takeover":
      return "Took over the conversation";
    case "handback":
      return "Handed back to the Keeper";
    case "review": {
      const decision = detailString(e.detail, "decision");
      const timer = Boolean(e.detail && typeof e.detail === "object" && (e.detail as Record<string, unknown>).timer);
      const amount = money(offerAmount(), currency);
      if (decision === "approved") return `Approved ${amount}`;
      return timer ? `Passed on ${amount}, below the floor` : `Declined ${amount}`;
    }
    case "deal": {
      const amount = money(num(e.detail, "amount"), currency);
      if (e.detail && typeof e.detail === "object" && (e.detail as Record<string, unknown>).confirmed) return `Confirmed the deal at ${amount}`;
      return detailString(e.detail, "status") === "deal" ? `Deal closed at ${amount}` : `Deal agreed at ${amount}, sent to you to confirm`;
    }
    case "pickup_released":
      return "Released pickup details";
    case "spar_started": {
      const persona = detailString(e.detail, "persona");
      return `Sent the ${persona && persona in CHARACTERS ? CHARACTERS[persona as keyof typeof CHARACTERS].name : "attacker"} in to spar`;
    }
    default:
      return e.type;
  }
}

export function Timeline({ detail, currency }: { detail: ThreadDetail; currency: string }) {
  const [withMessages, setWithMessages] = useState(false);
  const rows = [...detail.events]
    .filter((e) => withMessages || e.type !== "message")
    .reverse();
  return (
    <section className="flex flex-col gap-3" aria-label="Timeline">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Timeline</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="timeline-messages" className="text-xs text-muted-foreground">
            Messages
          </Label>
          <Switch id="timeline-messages" size="sm" checked={withMessages} onCheckedChange={setWithMessages} />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((e) => {
            const blocked = e.type === "blocked_attempt";
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  blocked && "border border-dashed border-floor bg-floor/10 py-2 font-semibold text-floor",
                )}
              >
                {blocked ? <Robot character="keeper" state="blocking" size={28} decorative /> : null}
                <ActorBadge actor={e.type === "counter" ? "agent" : e.actor} detail={detail} />
                <span className="min-w-0 flex-1">{describe(e, detail, currency)}</span>
                <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground" dateTime={e.createdAt}>
                  {clock(e.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
