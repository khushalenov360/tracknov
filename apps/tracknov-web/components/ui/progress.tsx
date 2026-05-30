export function Progress({ value }: { value: number }) {
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
      <div
        className="h-full rounded-full bg-[var(--color-green)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
