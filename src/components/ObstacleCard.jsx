import { Navigation, Check, Share2, Trash2 } from 'lucide-react';
import CategoryBadge from './CategoryBadge.jsx';
import { getType } from '../data/obstacleTypes.js';
import { timeAgo, remaining } from '../lib/time.js';

// Tek bildirim kartı. Sol kenarda kategori renkli ince çizgi (grafik öğe),
// başlıkta rozet + göreli zaman (monospace), altta canlılık ve eylemler.
export default function ObstacleCard({ pin, selected, now, onSelect, onConfirm, onShare, onDelete }) {
  const t = getType(pin.type);
  const rem = remaining(pin.expiresAt, now);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-surface shadow-card transition-colors ${
        selected ? 'border-brand ring-1 ring-brand' : 'border-border hover:border-muted/60'
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: t.color }}
      aria-current={selected ? 'true' : undefined}
    >
      <button
        type="button"
        onClick={() => onSelect(pin)}
        className="block w-full px-3.5 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge typeKey={pin.type} />
          <time
            className="shrink-0 pt-0.5 font-mono text-[11px] text-muted"
            dateTime={pin.createdAt}
          >
            {timeAgo(pin.createdAt, now)}
          </time>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{pin.notes}</p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-brand">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          <span className="font-mono">Canlı · kalan {rem.label}</span>
        </div>
      </button>

      <div className="flex items-center gap-1 border-t border-border bg-surface-2/60 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onSelect(pin)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2"
        >
          <Navigation size={13} className="text-brand" aria-hidden="true" />
          Haritada göster
        </button>
        <button
          type="button"
          onClick={() => onConfirm(pin.id)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2"
          title="Engel hâlâ duruyor — süreyi yenile"
        >
          <Check size={13} className="text-brand" aria-hidden="true" />
          Hâlâ duruyor
        </button>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => onShare(pin)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Bildirimi paylaş"
          >
            <Share2 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(pin.id)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ramp"
            aria-label="Bildirimi sil"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
