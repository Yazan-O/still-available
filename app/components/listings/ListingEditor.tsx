import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { FactChips } from "./FactChips";
import { STATUSES, type ListingStatus } from "./model";
import { PhotoPicker } from "./PhotoPicker";

export type ListingDraft = {
  title: string;
  description: string;
  facts: string[];
  photoUrl: string | null;
  askPrice: number;
  status: ListingStatus;
};

export function ListingEditor({
  draft,
  onChange,
  titleError,
}: {
  draft: ListingDraft;
  onChange: (next: ListingDraft) => void;
  titleError: string | null;
}) {
  const statusHint = STATUSES.find((s) => s.id === draft.status)?.hint;
  return (
    <div className="flex flex-col gap-5">
      <PhotoPicker value={draft.photoUrl} onChange={(photoUrl) => onChange({ ...draft, photoUrl })} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ls-title">Title</Label>
        <Input
          id="ls-title"
          value={draft.title}
          maxLength={120}
          placeholder="Mid-century desk lamp"
          aria-invalid={titleError ? true : undefined}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="text-base font-medium"
        />
        {titleError ? <p className="text-sm text-destructive">{titleError}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ls-desc">Description</Label>
        <Textarea
          id="ls-desc"
          rows={4}
          maxLength={2000}
          placeholder="What it is, what shape it is in, why you are selling."
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Facts</span>
        <FactChips value={draft.facts} onChange={(facts) => onChange({ ...draft, facts })} />
        <p className="text-xs text-muted-foreground">The robot answers buyers from these. If it is not here, it says it does not know.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" id="ls-status-label">
          Status
        </span>
        <div role="radiogroup" aria-labelledby="ls-status-label" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={draft.status === s.id}
              onClick={() => onChange({ ...draft, status: s.id })}
              className={cn(
                "rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                draft.status === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {statusHint ? <p className="text-xs text-muted-foreground">{statusHint}</p> : null}
      </div>
    </div>
  );
}
