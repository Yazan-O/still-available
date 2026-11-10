import { appPath } from "@agent-native/core/client/api-path";
import { IconCheck, IconCopy, IconExternalLink, IconLink } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function publicUrl(publicPath: string) {
  if (typeof window === "undefined") return publicPath;
  return new URL(appPath(publicPath), window.location.origin).toString();
}

export function SharePanel({ publicPath }: { publicPath: string }) {
  const [copied, setCopied] = useState(false);
  const url = publicUrl(publicPath);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <section aria-labelledby="share-title" className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <h2 id="share-title" className="flex items-center gap-2 text-sm font-semibold">
        <IconLink className="size-4 text-primary" aria-hidden />
        Your public link
      </h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <output
          aria-label="Public link"
          data-public-url={url}
          className="min-w-0 flex-1 truncate rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm"
        >
          {url}
        </output>
        <div className="flex gap-2">
          <Button type="button" onClick={copy} className="flex-1 sm:flex-none">
            {copied ? <IconCheck className="size-4" aria-hidden /> : <IconCopy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <a href={url} target="_blank" rel="noreferrer">
              <IconExternalLink className="size-4" aria-hidden />
              Open
            </a>
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste this into your listing: “Still available. Questions or offers? Ask my assistant: {url}”
      </p>
    </section>
  );
}
