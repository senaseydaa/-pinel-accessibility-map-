import { Search } from 'lucide-react';
import ObstacleCard from '../ObstacleCard.jsx';
import { OBSTACLE_LIST } from '../../data/obstacleTypes.js';

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  ...OBSTACLE_LIST.map((o) => ({ key: o.key, label: o.short, Icon: o.Icon, color: o.color })),
];

// "Bildirimler" görünümü — arama + filtre (sayılar çiplere gömülü) + tam yükseklik liste.
export default function ReportsView({
  counts,
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
}) {
  const countFor = (k) => (k === 'all' ? counts.total : counts[k] || 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink">Bildirimler</h2>
          <span className="font-mono text-[11px] text-muted">
            {pins.length}/{totalCount}
          </span>
        </div>

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

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
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
                <span className={`font-mono text-[11px] ${active ? 'text-white/80' : 'text-muted'}`}>{countFor(f.key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {pins.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            {totalCount === 0
              ? 'Henüz bildirim yok. "+" (Engel bildir) ile başlayın.'
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
    </div>
  );
}
