import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowLeft, IconRocket } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { GuardrailsPanel, type GuardrailsDraft } from "./GuardrailsPanel";
import { ListingEditor, type ListingDraft } from "./ListingEditor";
import { priceOrderError, type Guardrails, type ListingStatus, type SellerListing } from "./model";
import { SharePanel } from "./SharePanel";
import { Sparring } from "./Sparring";
import { StatusPill } from "./StatusPill";

const NEW_LISTING: ListingDraft = { title: "", description: "", facts: [], photoUrl: null, askPrice: 0, status: "draft" };
const NEW_GUARDRAILS: GuardrailsDraft = { floor: 0, limit: 0, counterSteps: 3, autoClose: false, pickupDetails: "", tone: "friendly" };

const fromListing = (l: SellerListing): ListingDraft => ({
  title: l.title,
  description: l.description,
  facts: [...l.facts],
  photoUrl: l.photoUrl,
  askPrice: l.askPrice,
  status: l.status,
});

const fromGuardrails = (g: Guardrails): GuardrailsDraft => ({
  floor: g.floorPrice,
  limit: g.robotLimitPrice,
  counterSteps: g.counterSteps,
  autoClose: g.autoClose,
  pickupDetails: g.pickupDetails,
  tone: g.tone,
});

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const errorCode = (e: unknown) => (e && typeof e === "object" && "errorCode" in e ? String((e as { errorCode: unknown }).errorCode) : undefined);

export function ListingDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Skeleton className="mb-6 h-9 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ListingDetailPage({ id }: { id: string }) {
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listing = useActionQuery("get-listing", { id }, { enabled: !isNew });
  const guardrails = useActionQuery("get-guardrails", { listingId: id }, { enabled: !isNew });
  const saveListing = useActionMutation("save-listing");
  const setGuardrails = useActionMutation("set-guardrails");

  const [draft, setDraft] = useState<ListingDraft>(NEW_LISTING);
  const [gDraft, setGDraft] = useState<GuardrailsDraft>(NEW_GUARDRAILS);
  const [serverError, setServerError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [touchedPrices, setTouchedPrices] = useState(false);

  const base = useMemo(() => (listing.data ? fromListing(listing.data) : NEW_LISTING), [listing.data]);
  const gBase = useMemo(() => (guardrails.data ? fromGuardrails(guardrails.data) : NEW_GUARDRAILS), [guardrails.data]);
  const dirty = !same(draft, base) || !same(gDraft, gBase);

  useEffect(() => {
    if (!saving) setDraft(base);
  }, [base]);
  useEffect(() => {
    if (!saving) setGDraft(gBase);
  }, [gBase]);

  const orderError =
    draft.askPrice > 0 && (touchedPrices || !isNew) ? priceOrderError(draft.askPrice, gDraft.limit, gDraft.floor) : null;
  const priceError = serverError ?? orderError;

  function setAsk(v: number) {
    setServerError(null);
    if (isNew && !touchedPrices) setGDraft((g) => ({ ...g, limit: v, floor: v }));
    setDraft((d) => ({ ...d, askPrice: v }));
  }

  async function save(nextStatus?: ListingStatus) {
    const d = { ...draft, ...(nextStatus ? { status: nextStatus } : {}) };
    if (!d.title.trim()) {
      setTitleError("Give it a title buyers will recognise.");
      return;
    }
    setTitleError(null);
    if (!(d.askPrice > 0)) {
      setServerError("Set an asking price first.");
      return;
    }
    const order = priceOrderError(d.askPrice, gDraft.limit, gDraft.floor);
    if (order) {
      setServerError(order);
      return;
    }
    const listingInput = {
      title: d.title,
      description: d.description,
      facts: d.facts,
      photoUrl: d.photoUrl,
      askPrice: d.askPrice,
      status: d.status,
    };
    const gInput = {
      listingId: id,
      floorPrice: gDraft.floor,
      robotLimitPrice: gDraft.limit,
      counterSteps: gDraft.counterSteps,
      autoClose: gDraft.autoClose,
      pickupDetails: gDraft.pickupDetails,
      tone: gDraft.tone,
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await saveListing.mutateAsync(listingInput);
        await setGuardrails.mutateAsync({ ...gInput, listingId: created.id });
        toast.success(d.status === "live" ? "Listing created and live." : "Listing created.");
        navigate(`/listings/${created.id}`, { replace: true });
        return;
      }
      const listingChanged = !same(d, base);
      const gChanged = !same(gDraft, gBase);
      if (d.askPrice >= base.askPrice) {
        if (listingChanged) await saveListing.mutateAsync({ id, ...listingInput });
        if (gChanged) await setGuardrails.mutateAsync(gInput);
      } else {
        if (gChanged) await setGuardrails.mutateAsync(gInput);
        if (listingChanged) await saveListing.mutateAsync({ id, ...listingInput });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["action", "get-listing"] }),
        qc.invalidateQueries({ queryKey: ["action", "get-guardrails"] }),
        qc.invalidateQueries({ queryKey: ["action", "list-listings"] }),
      ]);
      toast.success(nextStatus === "live" ? "Published. Your link is live." : "Saved.");
    } catch (e) {
      const code = errorCode(e);
      const message = actionErrorMessage(e) ?? "Could not save.";
      const priceClash = code === "invalid_price_order" || /floor|robot limit|asking price/i.test(message);
      if (priceClash && !isNew) {
        const [l, g] = await Promise.all([listing.refetch(), guardrails.refetch()]);
        if (l.data) setDraft(fromListing(l.data));
        if (g.data) setGDraft(fromGuardrails(g.data));
        setServerError(`Not saved: ${message} The prices changed somewhere else, so the saved ones are shown now.`);
        toast.error("Prices out of order. Nothing was saved.");
      } else if (priceClash) {
        setServerError(`Not saved: ${message}`);
        toast.error("Prices out of order. Nothing was saved.");
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && (listing.isPending || guardrails.isPending)) return <ListingDetailSkeleton />;
  if (!isNew && (listing.isError || guardrails.isError)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">
          {actionErrorMessage(listing.error ?? guardrails.error) ?? "That listing could not be loaded."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/listings">Back to listings</Link>
        </Button>
      </div>
    );
  }

  const live = !isNew && listing.data?.status === "live";
  const currency = listing.data?.currency ?? "USD";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button asChild variant="ghost" size="icon-sm" aria-label="All listings">
          <Link to="/listings">
            <IconArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {draft.title.trim() || (isNew ? "New listing" : "Untitled")}
        </h1>
        {!isNew && listing.data ? <StatusPill status={listing.data.status} /> : null}
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {dirty && !isNew ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setConfirmDiscard(true)}>
              Discard
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={saving || (!dirty && !isNew) || Boolean(orderError)} onClick={() => void save()}>
            {saving ? "Saving…" : isNew ? "Save draft" : "Save"}
          </Button>
          {!live ? (
            <Button
              type="button"
              disabled={saving || Boolean(orderError)}
              onClick={() => {
                setDraft((d) => ({ ...d, status: "live" }));
                void save("live");
              }}
              className="bg-tag text-tag-foreground hover:bg-tag/90"
            >
              <IconRocket className="size-4" aria-hidden />
              Publish
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ListingEditor draft={draft} onChange={setDraft} titleError={titleError} />
        <div className="flex min-w-0 flex-col gap-6">
          {live && listing.data ? <SharePanel publicPath={listing.data.publicPath} /> : null}
          <GuardrailsPanel
            ask={draft.askPrice}
            onAskChange={setAsk}
            draft={gDraft}
            onChange={(g) => {
              setServerError(null);
              setTouchedPrices(true);
              setGDraft(g);
            }}
            error={priceError}
            currency={currency}
          />
        </div>
      </div>

      {!isNew && listing.data ? (
        <div className="mt-8">
          <Sparring
            listingId={id}
            askPrice={listing.data.askPrice}
            currency={currency}
            guardrails={guardrails.data}
            dirty={dirty}
          />
        </div>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Save the listing to unlock Sparring, where attacker robots try to talk your robot below your floor.
        </p>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>The listing and guardrails go back to what was last saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDraft(base);
                setGDraft(gBase);
                setServerError(null);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
