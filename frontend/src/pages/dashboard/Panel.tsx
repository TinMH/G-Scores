import type { ReactNode } from 'react';

/** Compact card for the Dashboard's small panels (no bottom margin, so grid rows stay aligned). */
export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="surface flex flex-col p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function PanelError({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-900">
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-lg bg-surface px-3 py-1 text-xs font-semibold ring-1 ring-slate-300 hover:bg-slate-50"
      >
        {retryLabel}
      </button>
    </div>
  );
}
