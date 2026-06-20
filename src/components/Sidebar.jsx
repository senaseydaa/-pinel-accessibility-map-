import {
  Accessibility,
  TriangleAlert,
  Plus,
  Search,
  Sun,
  Moon,
  ArrowUpDown,
} from 'lucide-react';
import ObstacleCard from './ObstacleCard.jsx';
import { OBSTACLE_LIST } from '../data/obstacleTypes.js';

const FILTERS = [{ key: 'all', label: 'Tümü' }, ...OBSTACLE_LIST.map((o) => ({ key: o.key, label: o.short, Icon: o.Icon, color: o.color }))];

function Stat({ value, label }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="font-mono text-2xl font-extrabold leading-none text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

export default function Sidebar({
  counts,
  points,
  official,
  officialStatus,
  onRefreshOfficial,
  onFitOfficial,
  reportMode,
  onToggleReport,
  onDropAtCenter,
  query,
  onQuery,
  filter,
  onFilter,
  pins,
  totalCount,
  selectedId,
  now,
  votes,
  voterId,
  onSelect,
  onConfirm,
  onRefute,
  onShare,
  onDelete,
  theme,
  onToggleTheme,
  sheetExpanded,
  onToggleSheet,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Mobil tutamaç — listeyi aç/kapat */}
      <button
        type="button"
        onClick={onToggleSheet}
        className="flex w-full shrink-0 justify-center px-4 pb-1 pt-2.5 lg:hidden"
        aria-expanded={sheetExpanded}
      >
        <span className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <span className="sr-only">{sheetExpanded ? 'Paneli küçült' : 'Paneli genişlet'}</span>
      </button>

      {/* Üst blok — her zaman görünür (mobil tepe) */}
      <div className="shrink-0 px-4 pb-3 pt-1 lg:pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Accessibility size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="text-lg font-extrabold tracking-tight text-ink">PINel</span>
            <p className="truncate text-xs text-muted">Üsküdar Meydanı · Erişilebilirlik haritası</p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="icon-btn ml-auto"
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleReport}
          className={`mt-3 w-full ${reportMode ? 'btn-danger' : 'btn-primary'}`}
          aria-pressed={reportMode}
        >
          {reportMode ? <TriangleAlert size={16} /> : <Plus size={16} />}
          {reportMode ? 'Bildirim modu açık — bir nokta seçin' : 'Engel bildir'}
        </button>

        {reportMode && (
          <div className="mt-2 rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-muted">
            Haritada engelin olduğu yere dokunun. Fare kullanmadan eklemek için:
            <button
              type="button"
              onClick={onDropAtCenter}
              className="mt-2 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-2"
            >
              Harita merkezine pin bırak
            </button>
          </div>
        )}
      </div>

      {/* Açılır blok — mobilde genişletilince, masaüstünde her zaman */}
      <div className={`${sheetExpanded ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col lg:flex`}>
        {/* İstatistik */}
        <div className="grid shrink-0 grid-cols-4 gap-2 px-4 pb-3">
          <Stat value={counts.total} label="Toplam" />
          <Stat value={counts.rampa} label="Rampa" />
          <Stat value={counts.asansor} label="Asansör" />
          <Stat value={counts.calisma} label="Çalışma" />
        </div>

        {/* Resmî asansör verisi (Metro İstanbul) */}
        <div className="shrink-0 px-4 pb-3">
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <ArrowUpDown size={13} aria-hidden="true" />
                Resmî asansör durumu
              </span>
              <button
                type="button"
                onClick={onRefreshOfficial}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                Yenile
              </button>
            </div>

            {officialStatus === 'loading' && (
              <p className="mt-2 text-xs text-muted">Metro İstanbul verisi yükleniyor…</p>
            )}
            {officialStatus === 'error' && (
              <p className="mt-2 text-xs text-ramp">Resmî veriye şu an ulaşılamıyor.</p>
            )}
            {officialStatus === 'success' && official && (
              <>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {official.uskudarCount === 0
                    ? 'Üsküdar (M5): asansörler çalışıyor ✓'
                    : `Üsküdar (M5): ${official.uskudarCount} asansör arızalı`}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  M5 hattı: {official.m5Count} · Ağ geneli: {official.networkTotal} arıza
                </p>
                {official.m5Count > 0 && (
                  <button
                    type="button"
                    onClick={onFitOfficial}
                    className="mt-2 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-2"
                  >
                    M5 arızalarını haritada göster
                  </button>
                )}
                <p className="mt-2 text-[10px] leading-snug text-muted">
                  Kaynak: Metro İstanbul açık verisi ·{' '}
                  {new Date(official.fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}{' '}
                  güncellendi
                </p>
              </>
            )}
          </div>
        </div>

        {/* Arama */}
        <div className="shrink-0 px-4 pb-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Bildirimlerde ara"
              aria-label="Bildirimlerde ara"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70"
            />
          </div>
        </div>

        {/* Filtre çipleri */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilter(f.key)}
                aria-pressed={active}
                className={`chip ${active ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:text-ink'}`}
              >
                {f.Icon && <f.Icon size={13} style={{ color: active ? '#fff' : f.color }} aria-hidden="true" />}
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Liste */}
        <div className="flex items-center justify-between px-4 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Bildirimler</span>
          <span className="font-mono text-[11px] text-muted">
            {pins.length}/{totalCount}
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4">
          {pins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              {totalCount === 0
                ? 'Henüz bildirim yok. Haritaya bir engel ekleyerek başlayın.'
                : 'Bu filtreye uygun bildirim yok.'}
            </div>
          ) : (
            pins.map((pin) => (
              <ObstacleCard
                key={pin.id}
                pin={pin}
                selected={pin.id === selectedId}
                now={now}
                myVote={votes[pin.id]}
                isOwn={pin.authorId === voterId}
                onSelect={onSelect}
                onConfirm={onConfirm}
                onRefute={onRefute}
                onShare={onShare}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2.5 font-mono text-[10px] text-muted">
          <span>Katkınız: {points} puan</span>
          <span>Engelsiz Üsküdar · {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
