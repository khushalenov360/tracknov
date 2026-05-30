import { Loader2 } from "lucide-react";

export function PageLoading({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <main className="mx-auto flex min-h-[320px] w-full items-center justify-center px-4">
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-green)]" />
        {label}
      </div>
    </main>
  );
}

