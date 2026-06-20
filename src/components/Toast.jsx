import { CheckCircle, TriangleAlert, Info, X } from 'lucide-react';

const ICONS = { success: CheckCircle, error: TriangleAlert, info: Info };

// Ekran okuyucuya duyurulan bildirimler (aria-live).
export default function Toast({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[1200] flex flex-col items-center gap-2 px-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-pop"
          >
            <Icon
              size={17}
              className={`mt-0.5 shrink-0 ${t.type === 'error' ? 'text-ramp' : 'text-brand'}`}
              aria-hidden="true"
            />
            <span className="leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="ml-auto -mr-1 shrink-0 rounded p-0.5 text-muted hover:text-ink"
              aria-label="Bildirimi kapat"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
