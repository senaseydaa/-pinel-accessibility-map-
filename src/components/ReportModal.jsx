import { useEffect, useId, useRef, useState } from 'react';
import { X, TriangleAlert, Camera, Trash2 } from 'lucide-react';
import { OBSTACLE_LIST } from '../data/obstacleTypes.js';
import { fileToResizedDataURL } from '../lib/photo.js';

// Erişilebilir engel bildirim diyaloğu: role="dialog" + aria-modal, odak tuzağı,
// Esc ile kapatma, açılışta forma odak, kategori için radyo grubu.
// Fotoğraf spam'e karşı zorunludur (kamera veya galeri; tarayıcıda küçültülür).
export default function ReportModal({ coords, onClose, onSave }) {
  const [type, setType] = useState('rampa');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoErr, setPhotoErr] = useState(null);
  const dialogRef = useRef(null);
  const firstRef = useRef(null);
  const fileRef = useRef(null);
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
      const f = dialogRef.current?.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
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

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErr(null);
    try {
      setPhoto(await fileToResizedDataURL(file));
    } catch (err) {
      setPhotoErr(err.message);
    }
  }

  const submit = (e) => {
    e.preventDefault();
    if (!photo) {
      setPhotoErr('Spam’ı önlemek için fotoğraf zorunlu.');
      return;
    }
    onSave(type, notes.trim(), photo);
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
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-pop sm:rounded-2xl"
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
                      active ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:bg-surface-2'
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
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Fotoğraf <span className="font-normal normal-case text-muted">(zorunlu)</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="sr-only"
              aria-label="Fotoğraf seç"
            />
            {photo ? (
              <div className="relative">
                <img src={photo} alt="Seçilen fotoğraf önizlemesi" className="h-40 w-full rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-card hover:bg-surface"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Kaldır
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-sm font-semibold text-muted hover:bg-surface-2"
              >
                <Camera size={18} aria-hidden="true" />
                Fotoğraf çek veya seç
              </button>
            )}
            {photoErr && <p className="mt-1.5 text-xs font-semibold text-ramp">{photoErr}</p>}
          </div>

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
          <button type="submit" className="btn-primary flex-[2]" disabled={!photo}>
            Haritaya ekle
          </button>
        </div>
      </form>
    </div>
  );
}
