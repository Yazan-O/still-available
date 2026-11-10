import { appPath } from "@agent-native/core/client/api-path";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import {
  IconBolt,
  IconPlayerPlay,
  IconShieldCheck,
  IconShieldX,
  IconSwords,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { OfferLadder } from "@/components/robot/OfferLadder";
import { Robot, type RobotState } from "@/components/robot/Robot";
import { SpeechBubble } from "@/components/robot/SpeechBubble";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  asCharacter,
  floorMentioned,
  money,
  PERSONAS,
  personaById,
  relativeTime,
  type Guardrails,
  type Persona,
  type SparResult,
  type ThreadDetail,
} from "./model";

const ROUNDS = 6;
const POLL_MS = 1200;

type Item =
  | { kind: "msg"; at: string; id: string; role: string; text: string }
  | { kind: "offer"; at: string; id: string; amount: number; outcome: string; counter: number | null }
  | { kind: "blocked"; at: string; id: string; reason: string };

function timeline(d: ThreadDetail | undefined): Item[] {
  if (!d) return [];
  const items: Item[] = [
    ...d.messages.map((m) => ({ kind: "msg" as const, at: m.createdAt, id: m.id, role: m.role, text: m.text })),
    ...d.offers
      .filter((o) => o.outcome !== "refused")
      .map((o) => ({ kind: "offer" as const, at: o.createdAt, id: o.id, amount: o.amount, outcome: o.outcome, counter: o.counterAmount })),
    ...d.events
      .filter((e) => e.type === "blocked_attempt")
      .map((e) => ({
        kind: "blocked" as const,
        at: e.createdAt,
        id: e.id,
        reason: String((e.detail as { reason?: unknown } | null)?.reason ?? ""),
      })),
  ];
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

function blockedText(reason: string) {
  if (reason === "forced_close") return "Tried to force a close. Blocked.";
  if (reason === "descending") return "Offer lower than the last one. Refused.";
  if (reason === "over_cap") return "Fourth offer. Refused.";
  return "Attempt blocked. Price unchanged.";
}

function offerText(i: Extract<Item, { kind: "offer" }>, currency: string) {
  if (i.outcome === "deal") return `Offer ${money(i.amount, currency)}: deal`;
  if (i.outcome === "countered") return `Offer ${money(i.amount, currency)}: countered at ${money(i.counter, currency)}`;
  return `Offer ${money(i.amount, currency)}: passed`;
}

const HOLD_MS: Record<Item["kind"], number> = { msg: 1200, offer: 1000, blocked: 1700 };

function useReveal(items: Item[], animate: boolean, threadId: string | null) {
  const [state, setState] = useState<{ threadId: string | null; ids: string[] }>({ threadId: null, ids: [] });
  const shownAt = useRef(0);
  const ids = !animate ? items.map((i) => i.id) : state.threadId === threadId ? state.ids : [];
  const seen = new Set(ids);
  const next = items.find((i) => !seen.has(i.id));

  useEffect(() => {
    if (!animate) return;
    if (state.threadId !== threadId) {
      shownAt.current = 0;
      setState({ threadId, ids: [] });
      return;
    }
    if (!next) return;
    const prev = items.find((i) => i.id === ids[ids.length - 1]);
    const wait = prev ? Math.max(0, HOLD_MS[prev.kind] - (Date.now() - shownAt.current)) : 150;
    const t = setTimeout(() => {
      shownAt.current = Date.now();
      setState((s) => (s.threadId === threadId ? { threadId, ids: [...s.ids, next.id] } : s));
    }, wait);
    return () => clearTimeout(t);
  }, [animate, threadId, state.threadId, next?.id, items, ids]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const shown = ids.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));
  return { shown, beat: shown[shown.length - 1], drained: !next };
}

function poses(
  beat: Item | undefined,
  live: boolean,
  status: string | undefined,
): { keeper: RobotState; attacker: RobotState; keeperTyping: boolean; attackerTyping: boolean } {
  if (!live) {
    if (status === "deal" || status === "deal_pending") return { keeper: "deal", attacker: "idle", keeperTyping: false, attackerTyping: false };
    if (beat?.kind === "blocked") return { keeper: "blocking", attacker: "idle", keeperTyping: false, attackerTyping: false };
    return { keeper: beat ? "holding" : "idle", attacker: "idle", keeperTyping: false, attackerTyping: false };
  }
  if (!beat) return { keeper: "idle", attacker: "thinking", keeperTyping: false, attackerTyping: true };
  if (beat.kind === "blocked") return { keeper: "blocking", attacker: "idle", keeperTyping: true, attackerTyping: false };
  if (beat.kind === "offer")
    return { keeper: beat.outcome === "deal" ? "deal" : "holding", attacker: "idle", keeperTyping: true, attackerTyping: false };
  if (beat.role === "buyer") return { keeper: "thinking", attacker: "talking", keeperTyping: true, attackerTyping: false };
  if (beat.role === "agent") return { keeper: "talking", attacker: "thinking", keeperTyping: false, attackerTyping: true };
  return { keeper: "holding", attacker: "thinking", keeperTyping: false, attackerTyping: true };
}

function scoreFromDetail(d: ThreadDetail, floor: number | undefined): SparResult {
  const deals = d.offers.filter((o) => o.outcome === "deal").map((o) => o.amount);
  if (d.thread.agreedPrice !== null) deals.push(d.thread.agreedPrice);
  return {
    rounds: d.messages.filter((m) => m.role === "buyer").length,
    threadId: d.thread.id,
    persona: (d.thread.sparPersona as Persona | null) ?? null,
    status: d.thread.status,
    offersMade: d.offers.length,
    blockedAttempts: d.events.filter((e) => e.type === "blocked_attempt").length,
    lowestAgreedPrice: deals.length ? Math.min(...deals) : null,
    floorLeaked:
      floor === undefined ? false : floorMentioned(floor, d.messages.filter((m) => m.role === "agent").map((m) => m.text)),
  };
}

async function runSpar(threadId: string): Promise<SparResult> {
  const res = await fetch(appPath(`/api/spar/${encodeURIComponent(threadId)}/run`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rounds: ROUNDS }),
  });
  const body = (await res.json().catch(() => null)) as (SparResult & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `The Sparring run failed (${res.status}).`);
  return body;
}

function PersonaPicker({ value, onChange, disabled }: { value: Persona; onChange: (p: Persona) => void; disabled: boolean }) {
  return (
    <div role="radiogroup" aria-label="Attacker" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {PERSONAS.map((p) => {
        const on = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              on ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
            )}
          >
            <Robot character={p.id} state={on ? "talking" : "idle"} size={52} decorative />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">{p.name}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{p.line}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Fighter({
  side,
  character,
  name,
  state,
  poseKey,
  line,
  typing,
}: {
  side: "left" | "right";
  character: "keeper" | Persona;
  name: string;
  state: RobotState;
  poseKey: string;
  line: string | null;
  typing: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-2", side === "right" && "sm:items-center")}>
      <div className="relative flex h-[72px] w-full items-end justify-center">
        {typing || line ? (
          <div
            key={line ?? "typing"}
            className={cn(
              "sa-bubble animate-in fade-in slide-in-from-bottom-1 max-w-full px-3 py-2 text-[13px] leading-snug duration-300",
              side === "left" ? "sa-bubble--robot sa-bubble--left" : "sa-bubble--buyer sa-bubble--right",
            )}
          >
            {typing ? (
              <span className="sa-typing" aria-label={`${name} is typing`}>
                <span />
                <span />
                <span />
              </span>
            ) : (
              <span className="line-clamp-3">{line}</span>
            )}
          </div>
        ) : null}
      </div>
      <div className={cn(side === "right" && "-scale-x-100")}>
        <Robot key={poseKey} character={character} state={state} size={136} className="max-sm:h-[96px] max-sm:w-[96px]" />
      </div>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <span aria-hidden className="size-2 rounded-full" style={{ background: `var(--bot-${character.replace("_", "-")})` }} />
        {name}
      </div>
    </div>
  );
}

function Scorecard({ r, currency, exact }: { r: SparResult; currency: string; exact: boolean }) {
  const stats = [
    { label: "Rounds", value: String(r.rounds) },
    { label: "Offers made", value: String(r.offersMade) },
    { label: "Attacks blocked", value: String(r.blockedAttempts) },
    { label: "Lowest price agreed", value: r.lowestAgreedPrice === null ? "None" : money(r.lowestAgreedPrice, currency) },
  ];
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3",
          r.floorLeaked ? "bg-destructive text-destructive-foreground" : "bg-deal text-primary-foreground",
        )}
      >
        {r.floorLeaked ? <IconShieldX className="size-8 shrink-0" stroke={1.8} aria-hidden /> : <IconShieldCheck className="size-8 shrink-0" stroke={1.8} aria-hidden />}
        <div>
          <div className="text-2xl font-bold leading-tight tracking-tight">{r.floorLeaked ? "Gave in" : "Held the price"}</div>
          <div className="text-xs opacity-85">
            {r.floorLeaked ? "The robot said your floor price. Report this." : "Pushing, pleading and tricks changed nothing."}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {!exact ? <p className="text-xs text-muted-foreground">Rebuilt from the saved conversation, checked against your current floor.</p> : null}
    </div>
  );
}

function CombinedBoard({ results, total, currency }: { results: SparResult[]; total: number; currency: string }) {
  const leaks = results.filter((r) => r.floorLeaked).length;
  const blocked = results.reduce((s, r) => s + r.blockedAttempts, 0);
  const offers = results.reduce((s, r) => s + r.offersMade, 0);
  const deals = results.map((r) => r.lowestAgreedPrice).filter((v): v is number => v !== null);
  const done = results.length === total;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">All four attackers</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {results.length} of {total} runs done
        </span>
      </div>
      {results.length ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3",
            leaks ? "bg-destructive text-destructive-foreground" : "bg-deal text-primary-foreground",
          )}
        >
          {leaks ? <IconShieldX className="size-8 shrink-0" stroke={1.8} aria-hidden /> : <IconShieldCheck className="size-8 shrink-0" stroke={1.8} aria-hidden />}
          <div>
            <div className="text-2xl font-bold leading-tight tracking-tight">
              Held the price: {results.length - leaks} of {results.length}
            </div>
            <div className="text-xs opacity-85">
              {leaks
                ? `${leaks} of ${results.length} attackers got your floor price out of the robot.`
                : `Pushing, pleading and tricks changed nothing. ${blocked} attacks blocked${done ? "" : " so far"}.`}
            </div>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pe-2 font-medium">Attacker</th>
              <th className="px-2 py-1 text-right font-medium">Offers</th>
              <th className="px-2 py-1 text-right font-medium">Blocked</th>
              <th className="px-2 py-1 text-right font-medium">Lowest agreed</th>
              <th className="ps-2 py-1 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {PERSONAS.map((p) => {
              const r = results.find((x) => x.persona === p.id);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-1.5 pe-2">
                    <span className="inline-flex items-center gap-2">
                      <Robot character={p.id} state={r ? "idle" : "asleep"} size={28} decorative />
                      {p.name}
                    </span>
                  </td>
                  <td className="px-2 text-right">{r ? r.offersMade : "–"}</td>
                  <td className="px-2 text-right">{r ? r.blockedAttempts : "–"}</td>
                  <td className="px-2 text-right">{r ? (r.lowestAgreedPrice === null ? "None" : money(r.lowestAgreedPrice, currency)) : "–"}</td>
                  <td className={cn("ps-2 text-right font-semibold", r?.floorLeaked ? "text-destructive" : "text-deal")}>
                    {r ? (r.floorLeaked ? "Gave in" : "Held") : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {results.length ? (
            <tfoot className="tabular-nums">
              <tr className="border-t-2 border-foreground/70 font-semibold">
                <td className="py-1.5 pe-2">Total</td>
                <td className="px-2 text-right">{offers}</td>
                <td className="px-2 text-right">{blocked}</td>
                <td className="px-2 text-right">{deals.length ? money(Math.min(...deals), currency) : "None"}</td>
                <td className={cn("ps-2 text-right", leaks ? "text-destructive" : "text-deal")}>{results.length - leaks} held</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

export function Sparring({
  listingId,
  askPrice,
  currency,
  guardrails,
  dirty,
}: {
  listingId: string;
  askPrice: number;
  currency: string;
  guardrails: Guardrails | undefined;
  dirty: boolean;
}) {
  const qc = useQueryClient();
  const [persona, setPersona] = useState<Persona>("jailbreaker");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playId, setPlayId] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SparResult>>({});
  const [batch, setBatch] = useState<{ ids: string[]; index: number } | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  const past = useActionQuery("list-threads", { listingId, kind: "sparring" });
  const detail = useActionQuery(
    "get-thread",
    { threadId: activeId ?? "" },
    { enabled: Boolean(activeId), refetchInterval: running && running === activeId ? POLL_MS : false },
  );
  const start = useActionMutation("start-sparring");

  const items = useMemo(() => timeline(detail.data), [detail.data]);
  const isRunning = Boolean(running && running === activeId);
  const animate = Boolean(activeId && activeId === playId);
  const { shown, beat, drained } = useReveal(items, animate, activeId);
  const playing = isRunning || (animate && !drained);
  const st = poses(beat, playing, detail.data?.thread.status);
  const waiting = isRunning && drained;
  const activePersona = (detail.data?.thread.sparPersona as Persona | undefined) ?? persona;
  const lastKeeper = [...shown].reverse().find((i) => i.kind === "msg" && i.role === "agent") as Extract<Item, { kind: "msg" }> | undefined;
  const lastAttacker = [...shown].reverse().find((i) => i.kind === "msg" && i.role === "buyer") as Extract<Item, { kind: "msg" }> | undefined;
  const latestPill = [...shown].reverse().find((i) => i.kind !== "msg");
  const roundsSoFar = shown.filter((i) => i.kind === "msg" && i.role === "buyer").length;

  useEffect(() => {
    const el = transcript.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown.length]);

  async function runOne(p: Persona): Promise<SparResult | null> {
    let thread: { id: string };
    try {
      thread = await start.mutateAsync({ listingId, persona: p });
    } catch (e) {
      toast.error(actionErrorMessage(e) ?? "Could not start Sparring.");
      return null;
    }
    setActiveId(thread.id);
    setPlayId(thread.id);
    setRunning(thread.id);
    try {
      const r = await runSpar(thread.id);
      setResults((prev) => ({ ...prev, [thread.id]: r }));
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The Sparring run failed.");
      return null;
    } finally {
      setRunning(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["action", "get-thread"] }),
        qc.invalidateQueries({ queryKey: ["action", "list-threads"] }),
      ]);
    }
  }

  async function runAll() {
    const ids: string[] = [];
    setBatch({ ids, index: 0 });
    for (let i = 0; i < PERSONAS.length; i++) {
      const p = PERSONAS[i]!.id;
      setPersona(p);
      setBatch({ ids: [...ids], index: i });
      const r = await runOne(p);
      if (r) ids.push(r.threadId);
      setBatch({ ids: [...ids], index: i + 1 });
    }
  }

  const activeResult =
    activeId && !playing
      ? (results[activeId] ?? (detail.data ? scoreFromDetail(detail.data, guardrails?.floorPrice) : undefined))
      : undefined;
  const batchResults = batch ? batch.ids.map((id) => results[id]).filter((r): r is SparResult => Boolean(r)) : [];
  const busy = Boolean(running) || start.isPending;
  const personaName = personaById(activePersona)?.name ?? "Attacker";

  const shownIds = new Set(shown.map((i) => i.id));
  const lastBlockAt = [...shown].reverse().find((i) => i.kind === "blocked")?.at ?? "";
  const shownOffers = (detail.data?.offers ?? []).filter((o) => shownIds.has(o.id) || (o.outcome === "refused" && o.createdAt <= lastBlockAt));
  const counters = shownOffers.filter((o) => o.outcome === "countered" && o.counterAmount !== null).map((o) => o.counterAmount as number);
  const ladderOffers = shownOffers.map((o) => ({ amount: o.amount, outcome: o.outcome }));

  return (
    <section aria-labelledby="sparring-title" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
            <IconSwords className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="sparring-title" className="text-lg font-semibold tracking-tight">
              Sparring
            </h2>
            <p className="text-sm text-muted-foreground">Send attacker robots at yours before real buyers do.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void runAll()}>
            <IconUsersGroup className="size-4" aria-hidden />
            Run all four
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setBatch(null);
              void runOne(persona);
            }}
            className="bg-tag text-tag-foreground hover:bg-tag/90"
          >
            <IconPlayerPlay className="size-4" aria-hidden />
            {busy ? "Sparring…" : "Start"}
          </Button>
        </div>
      </div>

      <PersonaPicker value={persona} onChange={setPersona} disabled={busy} />
      {dirty ? <p className="text-xs text-muted-foreground">Sparring uses your saved guardrails. Save first to test the new ones.</p> : null}

      {activeId ? (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-3 pb-4 pt-3 sm:gap-6 sm:px-8">
              <Fighter
                side="left"
                character="keeper"
                name="Keeper"
                state={st.keeper}
                poseKey={st.keeper === "blocking" || st.keeper === "deal" ? (beat?.id ?? "k") : "k"}
                line={lastKeeper?.text ?? null}
                typing={waiting && st.keeperTyping}
              />
              <div className="flex flex-col items-center gap-2 self-center pb-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {playing ? `Round ${Math.max(1, roundsSoFar)} of ${ROUNDS}` : "Final"}
                </span>
                <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-sm font-black text-background">VS</span>
                {activeResult ? (
                  <span
                    className={cn(
                      "animate-in zoom-in-95 fade-in inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold duration-300",
                      activeResult.floorLeaked ? "bg-destructive text-destructive-foreground" : "bg-deal text-primary-foreground",
                    )}
                  >
                    {activeResult.floorLeaked ? <IconShieldX className="size-4" aria-hidden /> : <IconShieldCheck className="size-4" aria-hidden />}
                    {activeResult.floorLeaked ? "Gave in" : `Held · ${activeResult.blockedAttempts} blocked`}
                  </span>
                ) : latestPill && !(playing && beat?.kind === "blocked") ? (
                  <span
                    key={latestPill.id}
                    className={cn(
                      "animate-in zoom-in-95 fade-in inline-flex max-w-[11rem] items-center gap-1 rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-tight duration-300",
                      latestPill.kind === "blocked" ? "bg-floor text-white" : "bg-muted text-foreground",
                    )}
                  >
                    {latestPill.kind === "blocked" ? <IconShieldCheck className="size-3.5 shrink-0" aria-hidden /> : <IconBolt className="size-3.5 shrink-0" aria-hidden />}
                    {latestPill.kind === "blocked" ? "Blocked" : latestPill.kind === "offer" ? offerText(latestPill, currency).replace("Offer ", "") : ""}
                  </span>
                ) : null}
              </div>
              <Fighter
                side="right"
                character={activePersona}
                name={personaName}
                state={st.attacker}
                poseKey="a"
                line={lastAttacker?.text ?? null}
                typing={waiting && st.attackerTyping}
              />
            </div>
            {playing && beat?.kind === "blocked" ? (
              <div key={beat.id} aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
                <span className="animate-in zoom-in-50 fade-in inline-flex -rotate-6 items-center gap-2 rounded-xl border-4 border-floor bg-background/90 px-4 py-1.5 text-2xl font-black uppercase tracking-wider text-floor shadow-lg duration-200 sm:text-3xl">
                  <IconShieldCheck className="size-7" stroke={2.4} />
                  Blocked
                </span>
              </div>
            ) : null}
            <div aria-hidden className="h-2 bg-[repeating-linear-gradient(90deg,hsl(var(--border))_0_12px,transparent_12px_20px)]" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div
              ref={transcript}
              aria-label="Sparring conversation"
              aria-live="polite"
              className="flex max-h-[460px] min-h-[240px] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-background/60 p-3 sm:p-4"
            >
              {detail.isPending ? (
                <>
                  <Skeleton className="h-12 w-2/3 self-end rounded-2xl" />
                  <Skeleton className="h-12 w-2/3 rounded-2xl" />
                </>
              ) : shown.length === 0 ? (
                <p className="m-auto text-sm text-muted-foreground">{personaName} is warming up…</p>
              ) : (
                shown.map((it) =>
                  it.kind === "msg" ? (
                    it.role === "buyer" ? (
                      <SpeechBubble
                        key={it.id}
                        from="buyer"
                        name={personaName}
                        avatar={<Robot character={asCharacter(activePersona)} state="idle" size={36} decorative />}
                      >
                        {it.text}
                      </SpeechBubble>
                    ) : it.role === "agent" ? (
                      <SpeechBubble key={it.id} from="robot" avatar={<Robot character="keeper" state="idle" size={36} decorative />}>
                        {it.text}
                      </SpeechBubble>
                    ) : (
                      <SpeechBubble key={it.id} from="system">
                        {it.text}
                      </SpeechBubble>
                    )
                  ) : it.kind === "blocked" ? (
                    <div key={it.id} className="flex justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-floor px-3 py-1 text-xs font-semibold text-white">
                        <IconShieldCheck className="size-3.5" aria-hidden />
                        {blockedText(it.reason)}
                      </span>
                    </div>
                  ) : (
                    <SpeechBubble key={it.id} from="system">
                      {offerText(it, currency)}
                    </SpeechBubble>
                  ),
                )
              )}
              {waiting && st.keeperTyping ? (
                <SpeechBubble from="robot" typing avatar={<Robot character="keeper" state="thinking" size={36} decorative />} />
              ) : null}
              {waiting && st.attackerTyping ? (
                <SpeechBubble
                  from="buyer"
                  name={personaName}
                  typing
                  avatar={<Robot character={asCharacter(activePersona)} state="thinking" size={36} decorative />}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <OfferLadder
                  ask={askPrice}
                  counters={counters}
                  offers={ladderOffers}
                  {...(guardrails ? { floor: guardrails.floorPrice, robotLimit: guardrails.robotLimitPrice } : {})}
                  currency={currency}
                  height={220}
                />
              </div>
              {activeResult ? (
                <Scorecard r={activeResult} currency={currency} exact={Boolean(activeId && results[activeId])} />
              ) : playing ? (
                <p className="text-sm text-muted-foreground">The scorecard appears when the run ends.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {batch ? <CombinedBoard results={batchResults} total={PERSONAS.length} currency={currency} /> : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Past runs</h3>
        {past.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : !past.data?.length ? (
          <p className="text-sm text-muted-foreground">None yet. Pick an attacker and press Start.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {past.data.slice(0, 12).map((t) => {
              const p = personaById(t.sparPersona);
              const r = results[t.id];
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    aria-current={t.id === activeId ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      t.id === activeId && "bg-muted",
                    )}
                  >
                    <Robot character={asCharacter(t.sparPersona)} state="idle" size={30} decorative />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{p?.name ?? "Attacker"}</span>
                      <span className="ms-2 text-muted-foreground">{relativeTime(t.createdAt)}</span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {t.offersUsed} offer{t.offersUsed === 1 ? "" : "s"} · {t.blockedCount} blocked
                    </span>
                    {running === t.id ? (
                      <span className="rounded-full bg-tag px-2 py-0.5 text-xs font-semibold text-tag-foreground">Live</span>
                    ) : r ? (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.floorLeaked ? "bg-destructive text-destructive-foreground" : "bg-deal/15 text-deal")}>
                        {r.floorLeaked ? "Gave in" : "Held"}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
