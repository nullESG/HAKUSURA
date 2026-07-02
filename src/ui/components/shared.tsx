/** 画面共通の小部品。 */
import type { ReactNode } from 'react';

export function Bar({
  value,
  max,
  colorClass,
  heightClass = 'h-2',
}: {
  value: number;
  max: number;
  colorClass: string;
  heightClass?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-full bg-neutral-800`}>
      <div className={`${heightClass} ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Button({
  onClick,
  disabled,
  variant = 'primary',
  className = '',
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
  children: ReactNode;
}) {
  const base =
    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none';
  const styles = {
    primary: 'bg-amber-600 text-neutral-950 active:bg-amber-500',
    ghost: 'bg-neutral-800 text-neutral-200 active:bg-neutral-700',
    danger: 'bg-rose-700 text-rose-50 active:bg-rose-600',
  } as const;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      {title && <h2 className="mb-2 text-xs font-bold tracking-wider text-neutral-400">{title}</h2>}
      {children}
    </section>
  );
}

/** 画面下から出るモーダル(スマホ向けボトムシート)。 */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-neutral-700 bg-neutral-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
