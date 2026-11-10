import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CHARACTERS, type RobotCharacter } from "./characters";

import "./robot.css";

export type Speaker = "buyer" | "robot" | "seller" | "system";

export interface SpeechBubbleProps {
  from: Speaker;
  children?: ReactNode;
  typing?: boolean;
  name?: string;
  meta?: ReactNode;
  character?: RobotCharacter;
  avatar?: ReactNode;
  className?: string;
}

export function TypingDots({ label = "Typing" }: { label?: string }) {
  return (
    <span className="sa-typing" role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </span>
  );
}

export function SpeechBubble({
  from,
  children,
  typing = false,
  name,
  meta,
  character = "keeper",
  avatar,
  className,
}: SpeechBubbleProps) {
  if (from === "system") {
    return (
      <div className={cn("flex justify-center py-1", className)}>
        <div className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-center text-xs font-medium text-muted-foreground">
          {children}
        </div>
      </div>
    );
  }
  const right = from === "buyer";
  const heading =
    name ??
    (from === "robot"
      ? CHARACTERS[character].name
      : from === "seller"
        ? "Seller"
        : undefined);
  return (
    <div
      className={cn(
        "flex items-end gap-2.5",
        right ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      {avatar ? <div className="mb-0.5 shrink-0">{avatar}</div> : null}
      <div
        className={cn(
          "flex min-w-0 max-w-[min(32rem,85%)] flex-col gap-1",
          right ? "items-end" : "items-start",
        )}
      >
        {heading ? (
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
            {from === "robot" ? (
              <span
                aria-hidden
                className="size-2 rounded-full ring-1 ring-foreground/25"
                style={{ background: CHARACTERS[character].color }}
              />
            ) : null}
            {from === "seller" ? (
              <span aria-hidden className="size-2 rounded-full bg-tag" />
            ) : null}
            <span>{heading}</span>
          </div>
        ) : null}
        <div
          className={cn(
            "sa-bubble",
            `sa-bubble--${from}`,
            right ? "sa-bubble--right" : "sa-bubble--left",
          )}
        >
          {typing ? <TypingDots label={`${heading ?? "Buyer"} is typing`} /> : children}
        </div>
        {meta ? (
          <div className="px-1 text-[11px] tabular-nums text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}
