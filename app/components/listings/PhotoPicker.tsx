import { IconPhotoPlus, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIDE = 1024;
const MAX_CHARS = 400_000;

async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file is not an image this browser can read."));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot resize images.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length < MAX_CHARS) return data;
    }
    throw new Error("This photo is still over 400 kB after shrinking it to 1024 px. Try a simpler or smaller photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (JPG, PNG, WebP).");
      return;
    }
    setBusy(true);
    try {
      onChange(await downscale(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/60 transition-colors",
          over ? "border-tag bg-accent" : value ? "border-transparent" : "border-border",
        )}
      >
        {value ? (
          <img src={value} alt="Listing photo" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconPhotoPlus className="size-8" stroke={1.4} aria-hidden />
            <span className="text-sm font-medium text-foreground">{busy ? "Shrinking photo…" : "Add a photo"}</span>
            <span className="text-xs">Drop it here or click to pick one</span>
          </button>
        )}
        {value ? (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button type="button" size="icon-sm" variant="secondary" aria-label="Remove photo" onClick={() => onChange(null)}>
              <IconTrash className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Listing photo file"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
