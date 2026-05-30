import type { WorkflowStateRender } from "@tracknov/core/workflow/state-renderer";

const toneClasses: Record<WorkflowStateRender["tone"], string> = {
  neutral: "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  info: "border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  warning: "border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  success: "border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  danger: "border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]",
  muted: "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]",
};

export function WorkflowStatePanel({
  render,
  assignedReviewer,
}: {
  render: WorkflowStateRender;
  assignedReviewer?: string | null;
}) {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">Workflow state</p>
          <span className={`mt-1 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${toneClasses[render.tone]}`}>
            {render.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">Lock state</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-primary)]">{render.lockMode.replace("_", " ")}</p>
        </div>
      </div>
      {assignedReviewer ? (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Assigned reviewer: {assignedReviewer}</p>
      ) : null}
      {render.blocker ? <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{render.blocker}</p> : null}
      <div className="mt-2">
        <p className="text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">Backend allowed actions</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {render.allowedActions.length ? render.allowedActions.join(", ") : "No workflow actions available"}
        </p>
      </div>
    </section>
  );
}
