"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[var(--color-bg)] text-[13px] text-[var(--color-text-primary)] antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-[560px] items-center px-4">
          <section className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-amber-light)] text-[var(--color-amber)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-[18px] font-medium text-[var(--color-text-primary)]">Something went wrong</h1>
                <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
                   Tracknov hit an unexpected issue while loading this screen. Please retry.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Button type="button" onClick={reset} className="h-[34px] rounded-md px-4">
                Try again
              </Button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

