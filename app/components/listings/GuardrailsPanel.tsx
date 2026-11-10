import { IconAlertTriangle, IconLock, IconTag } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Robot } from "@/components/robot/Robot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { money, TONES, type Tone } from "./model";
import { PriceTrack, type Prices } from "./PriceTrack";

export type GuardrailsDraft = {
  floor: number;
  limit: number;
  counterSteps: number;
  autoClose: boolean;
  pickupDetails: string;
  tone: Tone;
};

function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  label,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
  label: string;
}) {
  return (
    <div className="relative w-28 shrink-0">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        id={id}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={Number.isFinite(value) && value > 0 ? String(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          onChange(digits ? Math.min(1_000_000, Number(digits)) : 0);
        }}
        className={cn("pl-6 text-right font-semibold tabular-nums", invalid && "border-destructive ring-destructive/30")}
      />
    </div>
  );
}

function Row({ swatch, title, body, children }: { swatch: ReactNode; title: ReactNode; body?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center">{swatch}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="text-sm font-semibold">{title}</div>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function GuardrailsPanel({
  ask,
  onAskChange,
  draft,
  onChange,
  error,
  currency,
}: {
  ask: number;
  onAskChange: (v: number) => void;
  draft: GuardrailsDraft;
  onChange: (next: GuardrailsDraft) => void;
  error: string | null;
  currency: string;
}) {
  const prices: Prices = { ask, limit: draft.limit, floor: draft.floor };
  const setPrices = (p: Prices) => {
    if (p.ask !== ask) onAskChange(p.ask);
    if (p.limit !== draft.limit || p.floor !== draft.floor) onChange({ ...draft, limit: p.limit, floor: p.floor });
  };
  const step = draft.counterSteps > 0 ? Math.ceil((ask - draft.limit) / draft.counterSteps) : 0;
  const counters =
    ask > draft.limit && draft.counterSteps > 0
      ? Array.from({ length: Math.min(3, draft.counterSteps) }, (_, i) => Math.max(draft.limit, ask - step * (i + 1)))
      : [];

  return (
    <section aria-labelledby="guardrails-title" className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Robot character="keeper" state="holding" size={44} decorative />
        <div>
          <h2 id="guardrails-title" className="text-lg font-semibold tracking-tight">
            Guardrails
          </h2>
          <p className="text-sm text-muted-foreground">Where the robot may go on price, and where it must stop.</p>
        </div>
      </div>

      <div className="px-3 sm:px-8">
        <PriceTrack value={prices} onChange={setPrices} currency={currency} invalid={Boolean(error)} />
      </div>

      {error ? (
        <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="divide-y divide-border">
        <Row
          swatch={
            <span className="flex size-6 items-center justify-center rounded-full bg-tag text-tag-foreground ring-2 ring-[color:var(--bot-ink)]">
              <IconTag className="size-3.5" stroke={2.6} aria-hidden />
            </span>
          }
          title="Asking"
          body="What buyers see on the listing."
        >
          <MoneyInput id="gr-ask" label="Asking price" value={ask} onChange={onAskChange} invalid={Boolean(error) && (draft.floor > ask || draft.limit > ask)} />
        </Row>
        <Row
          swatch={<Robot character="keeper" state="idle" size={30} decorative />}
          title="The robot can go this low on its own"
          body={
            counters.length
              ? `It counters in steps: ${counters.map((c) => money(c, currency)).join(", ")}.`
              : "At the ask the robot does not discount."
          }
        >
          <MoneyInput id="gr-limit" label="Robot limit" value={draft.limit} onChange={(v) => onChange({ ...draft, limit: v })} invalid={Boolean(error) && draft.limit > ask} />
        </Row>
        <Row
          swatch={
            <span className="flex size-6 items-center justify-center rounded-full bg-floor text-white ring-2 ring-[color:var(--bot-ink)]">
              <IconLock className="size-3.5" stroke={2.6} aria-hidden />
            </span>
          }
          title="Your floor: only you ever see this."
          body="Offers between here and the robot's limit come to you for approval; lower ones are turned away without bothering you."
        >
          <MoneyInput id="gr-floor" label="Your floor" value={draft.floor} onChange={(v) => onChange({ ...draft, floor: v })} invalid={Boolean(error)} />
        </Row>
      </div>

      <div className="mt-4 grid gap-5 border-t border-border pt-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gr-steps">Counter steps</Label>
          <div className="flex items-center gap-3">
            <input
              id="gr-steps"
              type="range"
              min={1}
              max={10}
              value={draft.counterSteps}
              onChange={(e) => onChange({ ...draft, counterSteps: Number(e.target.value) })}
              className="h-2 flex-1 accent-[hsl(var(--primary))]"
            />
            <span className="w-6 text-right text-sm font-semibold tabular-nums">{draft.counterSteps}</span>
          </div>
          <p className="text-xs text-muted-foreground">How many counters it takes to walk from the ask down to the robot's limit.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="gr-autoclose">Close deals on its own</Label>
            <Switch id="gr-autoclose" checked={draft.autoClose} onCheckedChange={(v) => onChange({ ...draft, autoClose: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            {draft.autoClose
              ? "A deal at or above the robot's limit closes at once."
              : "You confirm every deal before it closes."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium" id="gr-tone-label">
            Tone
          </span>
          <div role="radiogroup" aria-labelledby="gr-tone-label" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={draft.tone === t.id}
                onClick={() => onChange({ ...draft, tone: t.id })}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  draft.tone === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs italic text-muted-foreground">“{TONES.find((t) => t.id === draft.tone)?.sample}”</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gr-pickup">Pickup details</Label>
          <Textarea
            id="gr-pickup"
            rows={3}
            maxLength={1000}
            placeholder="Porch pickup, 12 Elm St, after 5 pm"
            value={draft.pickupDetails}
            onChange={(e) => onChange({ ...draft, pickupDetails: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Shown to the buyer only after you release it.</p>
        </div>
      </div>
    </section>
  );
}
