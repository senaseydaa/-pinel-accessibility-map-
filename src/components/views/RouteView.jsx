import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Crosshair, X, Search, MapPin } from 'lucide-react';
import { fmtDuration, fmtDistance } from '../../lib/route.js';
import { fetchGeocode } from '../../lib/geocode.js';

const QUICK = [
  { name: 'Vapur İskelesi', coords: [41.0272, 29.0156] },
  { name: 'Marmaray Üsküdar', coords: [41.0261, 29.0143] },
];

const chip = 'chip border-border bg-surface text-muted hover:text-ink';

// "Rota" görünümü — engel-farkında erişilebilir rota. Başlangıç → hedef kartı,
// yazınca öneri getiren adres arama, erişilebilir adım listesi.
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
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  function onQueryChange(v) {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      fetchGeocode(v)
        .then((r) => {
          setSuggestions(r.suggestions || []);
          setOpen(true);
        })
        .catch(() => {
          setSuggestions([]);
          setOpen(false);
        });
    }, 250);
  }

  function pick(s) {
    onSetPreset({ coords: s.coords, name: s.label });
    setQ(s.label);
    setOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <h2 className="text-sm font-bold text-ink">Erişilebilir rota</h2>
        <p className="mt-0.5 text-xs text-muted">Tekerlekli sandalye profili · bildirilen engellerden kaçınır</p>

        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          {/* Başlangıç */}
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-brand" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{start.label}</span>
          </div>
          <div className="ml-[5px] flex flex-wrap gap-1.5 border-l-2 border-dashed border-border py-2 pl-4">
            <button type="button" onClick={onUseLocation} className={chip}>
              <LocateFixed size={13} aria-hidden="true" /> Konumum
            </button>
            <button type="button" onClick={onUseMeydan} className={chip}>
              <Crosshair size={13} aria-hidden="true" /> Meydan
            </button>
            <button
              type="button"
              onClick={onPickStart}
              aria-pressed={pickingFor === 'start'}
              className={pickingFor === 'start' ? 'chip border-brand bg-brand text-white' : chip}
            >
              Haritadan
            </button>
          </div>

          {/* Hedef */}
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full bg-ramp" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {end ? end.label : <span className="font-normal text-muted">Hedef seçin</span>}
            </span>
          </div>

          {/* Yazınca-çıkan adres arama */}
          <div className="relative mt-2 pl-[26px]">
            <Search size={15} className="pointer-events-none absolute left-[38px] top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => suggestions.length && setOpen(true)}
              placeholder="Yer ara (ör. Marmaray, hastane…)"
              aria-label="Hedef ara"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70"
            />
            {open && suggestions.length > 0 && (
              <ul className="absolute left-[26px] right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-pop">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-2"
                    >
                      <MapPin size={14} className="shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 truncate">{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 pl-[26px]">
            {QUICK.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  onSetPreset(p);
                  setQ(p.name);
                  setOpen(false);
                }}
                className={chip}
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onPickDest}
              aria-pressed={pickingFor === 'dest'}
              className={pickingFor === 'dest' ? 'chip border-brand bg-brand text-white' : chip}
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
