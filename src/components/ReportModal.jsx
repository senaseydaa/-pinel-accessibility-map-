import { useEffect, useId, useRef, useState } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { OBSTACLE_LIST } from '../data/obstacleTypes.js';

// Erişilebilir engel bildirim diyaloğu: role="dialog" + aria-modal, odak tuzağı,
// Esc ile kapatma, açılışta forma odak, kategori için radyo grubu.
export default function ReportModal({ coords, onClose, onSave }) {
  const [type, setType] = useState('rampa');
  const [notes, setNotes] = useState('');
  const dialogRef = useRef(null);
  const firstRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    firstRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    onSave(type, notes.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-pop sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-extrabold text-ink">
            <TriangleAlert size={18} className="text-ramp" aria-hidden="true" />
            Yeni engel bildir
          </h2>
          <button
            type="button"
            ref={firstRef}
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Pencereyi kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Koordinatlar
            </span>
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-ink">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Engel türü
            </legend>
            <div role="radiogroup" className="flex flex-col gap-2">
              {OBSTACLE_LIST.map((o) => {
                const active = type === o.key;
                const Icon = o.Icon;
                return (
                  <button
                    type="button"
                    key={o.key}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(o.key)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-brand bg-brand/5'
                        : 'border-border bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <Icon size={20} className="mt-0.5 shrink-0" style={{ color: o.color }} aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-bold text-ink">{o.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">{o.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-notes" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Açıklama <span className="font-normal normal-case">(isteğe bağlı)</span>
            </label>
            <textarea
              id="report-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Örn. Rampanın önüne gri bir araç park edilmiş."
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Vazgeç
          </button>
          <button type="submit" className="btn-primary flex-[2]">
            Haritaya ekle
          </button>
        </div>
      </form>
    </div>
  );
}
