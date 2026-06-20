import { LocateFixed, Navigation, MapPin, Crosshair, X } from 'lucide-react';
import { fmtDuration, fmtDistance } from '../../lib/route.js';

const ROUTE_PRESETS = [
  { name: 'Vapur İskelesi', coords: [41.0272, 29.0156] },
  { name: 'Marmaray / M5 Üsküdar', coords: [41.0264, 29.0148] },
  { name: 'Üsküdar Meydanı', coords: [41.0268, 29.0152] },
  { name: 'Mihrimah Sultan Camii', coords: [41.0261, 29.0162] },
];

// "Rota" görünümü — engel-farkında erişilebilir rota. Başlangıç/hedef seç, rota bul,
// adım listesini oku (ekran okuyucu + klavye erişilebilir).
export default function RouteView({
  start,
  end,
  route,
  routeStatus,
  pickingFor,
  onUseLocation,
  onUseMeydan,
  onPickStart,
  onPickDest,
  onSetPreset,
  onCompute,
  onClear,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <h2 className="text-sm font-bold text-ink">Erişilebilir rota</h2>
        <p className="mt-0.5 text-xs text-muted">Tekerlekli sandalye profili · bildirilen engellerden kaçınır</p>

        {/* Başlangıç */}
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Başlangıç</span>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <MapPin size={14} className="text-brand" aria-hidden="true" />
            {start.label}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={onUseLocation} className="chip border-border bg-surface text-muted hover:text-ink">
              <LocateFixed size={13} aria-hidden="true" /> Konumum
            </button>
            <button type="button" onClick={onUseMeydan} className="chip border-border bg-surface text-muted hover:text-ink">
              <Crosshair size={13} aria-hidden="true" /> Meydan
            </button>
            <button
              type="button"
              onClick={onPickStart}
              aria-pressed={pickingFor === 'start'}
              className={`chip ${pickingFor === 'start' ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:text-ink'}`}
            >
              Haritadan
            </button>
          </div>
        </div>

        {/* Hedef */}
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Hedef</span>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Navigation size={14} className="text-ramp" aria-hidden="true" />
            {end ? end.label : <span className="font-normal text-muted">seçilmedi</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ROUTE_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onSetPreset(p)}
                className="chip border-border bg-surface text-muted hover:text-ink"
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onPickDest}
              aria-pressed={pickingFor === 'dest'}
              className={`chip ${pickingFor === 'dest' ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:text-ink'}`}
            >
              Haritadan
            </button>
          </div>
        </div>

        {pickingFor && (
          <p className="mt-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
            Haritada {pickingFor === 'start' ? 'başlangıç' : 'hedef'} noktasına dokunun.
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onCompute} disabled={!end || routeStatus === 'loading'} className="btn-primary flex-1">
            {routeStatus === 'loading' ? 'Hesaplanıyor…' : 'Rota bul'}
          </button>
          {route && (
            <button type="button" onClick={onClear} className="btn-ghost" aria-label="Rotayı temizle">
              <X size={16} />
            </button>
          )}
        </div>
        {routeStatus === 'error' && <p className="mt-2 text-sm text-ramp">Rota bulunamadı. Başka nokta deneyin.</p>}
      </div>

      {/* Sonuç */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {routeStatus === 'success' && route && (
          <>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-sm font-bold text-ink">
                {fmtDistance(route.distance)} · {fmtDuration(route.duration)}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {route.engine === 'ors-wheelchair' ? '♿ Tekerlekli sandalye profili' : '🚶 Yaya rotası'}
                {route.avoidCount > 0 ? ` · ${route.avoidCount} bildirilen engelden kaçınıldı` : ''}
              </p>
              {route.engine !== 'ors-wheelchair' && (
                <p className="mt-1 text-[11px] text-muted">Tam tekerlekli sandalye profili için ORS anahtarı ekleyin.</p>
              )}
            </div>

            <ol className="mt-3 space-y-1.5">
              {route.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink">{s.instruction}</span>
                    {s.distance > 0 && <span className="font-mono text-[11px] text-muted">{fmtDistance(s.distance)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {routeStatus === 'idle' && (
          <p className="text-sm text-muted">Bir hedef seçip “Rota bul” deyin. Rota, bildirilen engellerin etrafından geçer.</p>
        )}
      </div>
    </div>
  );
}
