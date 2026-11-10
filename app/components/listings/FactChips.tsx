import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

export function FactChips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  function add() {
    const text = draft.trim();
    if (!text || value.length >= 20) return;
    onChange([...value, text.slice(0, 200)]);
    setDraft("");
  }

  function commitEdit(i: number) {
    const text = editText.trim();
    onChange(text ? value.map((f, j) => (j === i ? text.slice(0, 200) : f)) : value.filter((_, j) => j !== i));
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Facts">
          {value.map((fact, i) =>
            editing === i ? (
              <li key={i}>
                <Input
                  autoFocus
                  value={editText}
                  aria-label="Edit fact"
                  className="h-8 w-64"
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => commitEdit(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit(i);
                    }
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li
                key={i}
                className="group inline-flex max-w-full items-center gap-0.5 rounded-full border border-border bg-card py-0.5 pe-1 ps-3 text-sm"
              >
                <button
                  type="button"
                  className="truncate text-left outline-none focus-visible:underline"
                  title="Click to edit"
                  onClick={() => {
                    setEditing(i);
                    setEditText(fact);
                  }}
                >
                  {fact}
                </button>
                <button
                  type="button"
                  aria-label={`Remove fact: ${fact}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <IconX className="size-3.5" aria-hidden />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={value.length ? "Add another fact" : "Height 18 inches, small dent on the back…"}
          aria-label="New fact"
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Add fact"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconPlus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
