"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteLinkButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-auto rounded-full px-3 py-1.5 text-[11px]"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
