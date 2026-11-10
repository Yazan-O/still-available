import {
  MAX_MESSAGE_CHARS,
  type BuyerThread,
  type PublicListing,
} from "@shared/buyer";
import { IconArrowUp, IconRobot, IconTag, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { currencySymbol, money } from "./api";

export function Disclosure({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <IconRobot size={13} aria-hidden className="shrink-0" />
      You're talking to an AI assistant for the seller.
    </p>
  );
}

export function NamePrompt({ onChoose }: { onChoose: (name: string | null) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex flex-col gap-2 rounded-2xl rounded-tl-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onChoose(value);
      }}
    >
      <label htmlFor="buyer-name" className="text-sm font-medium">
        What should the seller call you?{" "}
        <span className="font-normal text-muted-foreground">Optional.</span>
      </label>
      <div className="flex items-center gap-1.5">
        <Input
          id="buyer-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="First name"
          maxLength={60}
          autoComplete="given-name"
          className="h-9 min-w-0 flex-1"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!value.trim()} className="h-9">
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChoose(null)} className="h-9">
          Skip
        </Button>
      </div>
    </form>
  );
}

const STARTERS = ["Is this still available?", "Any flaws I should know about?"];

export function Starters({
  currency,
  disabled,
  onSend,
  onPrefill,
}: {
  currency: string;
  disabled: boolean;
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
}) {
  const chip =
    "rounded-full border bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  return (
    <div className="flex flex-wrap justify-end gap-2" role="group" aria-label="Quick questions">
      {STARTERS.map((s) => (
        <button key={s} type="button" disabled={disabled} onClick={() => onSend(s)} className={cn(chip, "border-foreground/25")}>
          {s}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPrefill(`Would you take ${currencySymbol(currency)}`)}
        className={cn(chip, "border-dashed border-tag/80")}
      >
        Would you take …?
      </button>
    </div>
  );
}

export function Composer({
  listing,
  thread,
  onSendText,
  onOffer,
  blocked,
  prefillRef,
}: {
  listing: PublicListing;
  thread: BuyerThread | null;
  onSendText: (text: string) => void;
  onOffer: (amount: number) => void;
  blocked: boolean;
  prefillRef: RefObject<((text: string) => void) | null>;
}) {
  const [text, setText] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const offerInput = useRef<HTMLInputElement>(null);
  const offersLeft = thread?.offersLeft ?? 3;
  const highest = thread?.highestOffer ?? null;
  const counter = thread?.currentCounter ?? null;
  const amount = Number(offer);
  const offerValid =
    offer !== "" && Number.isInteger(amount) && amount > 0 && (highest === null || amount > highest);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  useEffect(() => {
    prefillRef.current = (value: string) => {
      setText(value);
      requestAnimationFrame(() => {
        const el = area.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    };
    return () => {
      prefillRef.current = null;
    };
  }, [prefillRef]);

  useEffect(() => {
    if (offerOpen) offerInput.current?.focus();
  }, [offerOpen]);

  useEffect(() => {
    if (offersLeft === 0) setOfferOpen(false);
  }, [offersLeft]);

  const send = () => {
    const clean = text.trim();
    if (!clean || blocked) return;
    onSendText(clean.slice(0, MAX_MESSAGE_CHARS));
    setText("");
    area.current?.focus();
  };

  const sendOffer = () => {
    if (!offerValid || blocked || offersLeft === 0) return;
    onOffer(amount);
    setOffer("");
    setOfferOpen(false);
    area.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const sym = currencySymbol(listing.currency);
  const hint =
    highest !== null && offer !== "" && !offerValid && amount > 0
      ? `Has to beat your last offer of ${money(highest, listing.currency)}.`
      : counter !== null
        ? `Keeper's counter is ${money(counter, listing.currency)}.`
        : `Asking ${money(listing.askPrice, listing.currency)}.`;

  return (
    <div className="flex flex-col gap-2.5">
      {offerOpen ? (
        <form
          className="flex flex-col gap-1.5 rounded-xl border border-tag/50 bg-card p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            sendOffer();
          }}
          aria-label="Make an offer"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="offer-amount" className="sr-only">
              Your offer in {listing.currency}
            </label>
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                {sym}
              </span>
              <Input
                id="offer-amount"
                ref={offerInput}
                type="number"
                inputMode="numeric"
                min={highest !== null ? highest + 1 : 1}
                step={1}
                value={offer}
                onChange={(e) => setOffer(e.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOfferOpen(false);
                }}
                placeholder={counter !== null ? String(counter) : String(listing.askPrice)}
                className={cn("h-10 pl-8 text-base font-semibold tabular-nums", sym.length > 1 && "pl-11")}
                aria-describedby="offer-hint"
              />
            </div>
            <Button
              type="submit"
              disabled={!offerValid || blocked}
              className="h-10 bg-tag text-tag-foreground hover:bg-tag/90"
            >
              Send offer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => setOfferOpen(false)}
              aria-label="Close offer"
            >
              <IconX size={18} aria-hidden />
            </Button>
          </div>
          <p id="offer-hint" className="px-1 text-xs text-muted-foreground">
            {hint}{" "}
            <span className="font-medium text-foreground">
              {offersLeft} of 3 offers left.
            </span>
          </p>
        </form>
      ) : null}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOfferOpen((o) => !o)}
          disabled={offersLeft === 0 || blocked}
          aria-expanded={offerOpen}
          className="h-11 shrink-0 gap-1.5 rounded-xl border-tag/60 px-3 font-semibold"
        >
          <IconTag size={17} aria-hidden className="text-tag" />
          <span className="hidden min-[400px]:inline">Make offer</span>
          <span className="min-[400px]:hidden">Offer</span>
          <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums text-muted-foreground" aria-label={`${offersLeft} offers left`}>
            {offersLeft}
          </span>
        </Button>
        <div className="relative flex min-w-0 flex-1 items-end rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
          <label htmlFor="buyer-message" className="sr-only">
            {thread?.mode === "seller" ? "Message the owner" : "Message Keeper"}
          </label>
          <Textarea
            id="buyer-message"
            ref={area}
            rows={1}
            value={text}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={thread?.mode === "seller" ? "Message the owner…" : "Ask Keeper…"}
            disabled={blocked}
            className="max-h-[132px] min-h-11 flex-1 resize-none border-0 bg-transparent py-2.5 pr-11 text-[0.95rem] shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={!text.trim() || blocked}
            aria-label="Send message"
            className="absolute bottom-1.5 right-1.5 size-8 rounded-lg"
          >
            <IconArrowUp size={18} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
