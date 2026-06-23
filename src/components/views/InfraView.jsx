import { useMemo, useState } from 'react';
import { distanceMeters } from '../../lib/geo.js';

const KINDS = [
  { key: 'all', label: 'Tümü' },
  { key: 'toilet', label: 'Tuvalet' },
  { key: 'ramp', label: 'Rampa' },
  { key: 'elevator', label: 'Asansör' },
  { key: 'parking', label: 'Otopark' },
  { key: 'tactile', label: 'Hissedilebilir' },
  { key: 'accessible', label: 'Erişilebilir' },
  { key: 'inaccessible', label: 'Erişime kapalı' },
];

const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

// "Altyapı" görünümü — OSM erişilebilir altyapı: tür filtresi + mesafeye göre
// sıralı liste ('en yakın erişilebilir tuvalet'). Ekran okuyucu için haritanın
// metin alternatifi.
export default function InfraView({ infra, infraStatus, onRefresh, showInfra, onToggleShow, from, onFocus }) {
  const [filter, setFilter] = useState('all');
  const items = useMemo(() => infra?.items || [], [infra]);

  const sorted = useMemo(
    () =>
      items
        .filter((i) => filter === 'all' || i.kind === filter)
        .map((i) => ({ ...i, dist: distanceMeters(from, [i.lat, i.lng]) }))
        .sort((a, b) => a.dist - b.dist),
    [items, filter, from]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink">Erişilebilir altyapı</h2>
          <button type="button" onClick={onRefresh} className="text-[12px] font-semibold text-brand hover:underline">
            Yenile
          </button>
        </div>
        <p className="mt-0.5 text-xs text-muted">OpenStreetMap · konumunuz çevresi (gezdikçe güncellenir)</p>

        <button type="button" onClick={onToggleShow} aria-pressed={showInfra} className={`mt-2 w-full ${showInfra ? 'btn-primary' : 'btn-ghost'}`}>
          {showInfra ? 'Haritada gösteriliyor ✓' : 'Haritada göster'}
        </button>

        {infraStatus === 'loading' && <p className="mt-3 text-sm text-muted">Yükleniyor…</p>}
        {infraStatus === 'error' && (
          <p className="mt-3 text-sm text-ramp">
            Veriye ulaşılamadı.{' '}
            <button type="button" onClick={onRefresh} className="font-semibold underline">
              Tekrar dene
            </button>
          </p>
        )}

        {infraStatus === 'success' && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {KINDS.map((k) => {
              const active = filter === k.key;
              const count = k.key === 'all' ? items.length : infra.byKind?.[k.key] || 0;
              return (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setFilter(k.key)}
                  aria-pressed={active}
                  className={`chip ${active ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:text-ink'}`}
                >
                  {k.label}
                  <span className={`font-mono text-[11px] ${active ? 'text-white/80' : 'text-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {infraStatus === 'idle' && <p className="text-sm text-muted">Yüklemek için “Haritada göster” düğmesine basın.</p>}
        {infraStatus === 'success' &&
          (sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">Bu türde nokta yok.</div>
          ) : (
            <ul className="space-y-1.5">
              {sorted.slice(0, 80).map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onFocus([i.lat, i.lng])}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i.kind === 'inaccessible' ? 'bg-ramp' : 'bg-brand'}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-ink">{i.label}</span>
                        {i.name && <span className="block truncate text-[11px] text-muted">{i.name}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{fmtDist(i.dist)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
