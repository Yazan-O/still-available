import { IconSend, IconShieldCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Robot, type RobotState } from "@/components/robot/Robot";
import { SpeechBubble } from "@/components/robot/SpeechBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { BuyerAvatar } from "./Avatars";
import { attackerOf, blockedLine, buyerLabel, clock, type ThreadDetail } from "./model";

const MAX_CHARS = 600;

type Line =
  | { kind: "message"; id: string; at: string; role: "buyer" | "agent" | "seller" | "system"; text: string; pending: boolean }
  | { kind: "blocked"; id: string; at: string; text: string }
  | { kind: "mode"; id: string; at: string; text: string };

function linesOf(d: ThreadDetail, currency: string): Line[] {
  const lines: Line[] = d.messages.map((m) => ({
    kind: "message",
    id: m.id,
    at: m.createdAt,
    role: m.role,
    text: m.text,
    pending: m.id.startsWith("pending-"),
  }));
  for (const e of d.events) {
    if (e.type === "blocked_attempt") lines.push({ kind: "blocked", id: e.id, at: e.createdAt, text: blockedLine(e, currency) });
    if (e.type === "takeover") lines.push({ kind: "mode", id: e.id, at: e.createdAt, text: "You took over. The Keeper is powered down." });
    if (e.type === "handback") lines.push({ kind: "mode", id: e.id, at: e.createdAt, text: "Handed back to the Keeper." });
  }
  return lines.sort((a, b) => a.at.localeCompare(b.at));
}

function YouAvatar() {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 items-center justify-center rounded-full bg-tag text-[11px] font-bold text-tag-foreground"
    >
      You
    </span>
  );
}

export function Conversation({
  detail,
  currency,
  keeperState,
  className,
}: {
  detail: ThreadDetail;
  currency: string;
  keeperState: RobotState;
  className?: string;
}) {
  const lines = linesOf(detail, currency);
  const t = detail.thread;
  const attacker = attackerOf(t);
  const name = buyerLabel(t);
  const boxRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const typing = keeperState === "thinking";

  useEffect(() => {
    const el = boxRef.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines.length, typing]);

  return (
    <div
      ref={boxRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className={cn("flex flex-col gap-3 px-4 py-4 sm:px-5", className)}
      role="log"
      aria-label={`Conversation with ${name}`}
    >
      {lines.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
      ) : null}
      {lines.map((l) => {
        if (l.kind === "blocked") {
          return (
            <div key={l.id} className="flex justify-center py-1">
              <div className="inline-flex max-w-[95%] items-center gap-2 rounded-full border border-dashed border-floor bg-floor/10 py-1 pl-1 pr-3 text-xs font-semibold text-floor">
                <Robot character="keeper" state="blocking" size={28} decorative />
                <IconShieldCheck size={14} aria-hidden />
                <span>Blocked. {l.text}</span>
              </div>
            </div>
          );
        }
        if (l.kind === "mode") {
          return (
            <SpeechBubble key={l.id} from="system">
              {l.text}
            </SpeechBubble>
          );
        }
        if (l.role === "system") {
          return (
            <SpeechBubble key={l.id} from="system">
              {l.text}
            </SpeechBubble>
          );
        }
        if (l.role === "buyer") {
          return (
            <SpeechBubble
              key={l.id}
              from="buyer"
              name={name}
              meta={clock(l.at)}
              avatar={attacker ? <BuyerAvatar thread={t} size={32} /> : undefined}
            >
              {l.text}
            </SpeechBubble>
          );
        }
        if (l.role === "seller") {
          return (
            <SpeechBubble
              key={l.id}
              from="seller"
              name="You"
              meta={l.pending ? "Sending" : clock(l.at)}
              avatar={<YouAvatar />}
              className={cn(l.pending && "opacity-70")}
            >
              {l.text}
            </SpeechBubble>
          );
        }
        return (
          <SpeechBubble
            key={l.id}
            from="robot"
            meta={clock(l.at)}
            avatar={<Robot character="keeper" state="idle" size={32} decorative />}
          >
            {l.text}
          </SpeechBubble>
        );
      })}
      {typing ? (
        <SpeechBubble from="robot" typing avatar={<Robot character="keeper" state="thinking" size={32} decorative />} />
      ) : null}
    </div>
  );
}

export function Composer({
  enabled,
  pending,
  onSend,
}: {
  enabled: boolean;
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const canSend = enabled && trimmed.length > 0 && trimmed.length <= MAX_CHARS;
  const send = () => {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };
  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={!enabled}
          rows={1}
          maxLength={MAX_CHARS}
          placeholder={enabled ? "Write to the buyer as yourself" : "The Keeper is answering"}
          aria-label="Message to the buyer"
          className="max-h-40 min-h-10 flex-1 resize-none"
        />
        <Button onClick={send} disabled={!canSend} aria-label="Send" className="shrink-0">
          <IconSend size={16} aria-hidden />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {enabled
          ? pending
            ? "Sending..."
            : "The buyer sees this as from the seller. Enter sends."
          : "The Keeper has this conversation. Switch on Take over to type."}
      </p>
    </div>
  );
}
