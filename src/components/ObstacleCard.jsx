import { Navigation, Check, X, Share2, Trash2 } from 'lucide-react';
import CategoryBadge from './CategoryBadge.jsx';
import { getType } from '../data/obstacleTypes.js';
import { getStatus } from '../lib/status.js';
import { timeAgo, remaining } from '../lib/time.js';

// Tek bildirim kartı. Topluluk oyu (hâlâ duruyor / kalktı), durum rozeti, foto.
// "Canlı" rozeti yok — haritadaki/listedeki her bildirim zaten geçerlidir; yalnızca
// kalan süre gösterilir. Silme yalnızca bildirimin sahibine açıktır.
export default function ObstacleCard({
  pin,
  selected,
  now,
  myVote,
  isOwn,
  onSelect,
  onConfirm,
  onRefute,
  onShare,
  onDelete,
}) {
  const rem = remaining(pin.expiresAt, now);
  const status = getStatus(pin);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-surface shadow-card transition-colors ${
        selected ? 'border-brand bg-brand/5' : 'border-border hover:border-muted/60'
      }`}
      aria-current={selected ? 'true' : undefined}
    >
      <button type="button" onClick={() => onSelect(pin)} className="block w-full px-3.5 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge typeKey={pin.type} />
          <time className="shrink-0 pt-0.5 font-mono text-[11px] text-muted" dateTime={pin.createdAt}>
            {timeAgo(pin.createdAt, now)}
          </time>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold ${
              status.key === 'confirmed' ? 'text-brand' : 'text-muted'
            }`}
          >
            {status.label}
          </span>
          <span className="font-mono text-[10px] text-muted">
            {pin.confirms || 0} onay · kalan {rem.label}
          </span>
        </div>

        {pin.photo && (
          <img
            src={pin.photo}
            alt={`${getType(pin.type).label} fotoğrafı`}
            className="mt-2.5 h-28 w-full rounded-lg border border-border object-cover"
            loading="lazy"
          />
        )}

        <p className="mt-2 text-[13px] leading-relaxed text-muted">{pin.notes}</p>
      </button>

      <div className="flex items-center gap-1 border-t border-border bg-surface-2/60 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onConfirm(pin.id)}
          aria-pressed={myVote === 'confirm'}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold hover:bg-surface-2 ${
            myVote === 'confirm' ? 'text-brand' : 'text-ink'
          }`}
          title="Engel hâlâ duruyor — doğrula ve süreyi yenile"
        >
          <Check size={13} aria-hidden="true" />
          Hâlâ duruyor
        </button>
        <button
          type="button"
          onClick={() => onRefute(pin.id)}
          aria-pressed={myVote === 'refute'}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold hover:bg-surface-2 ${
            myVote === 'refute' ? 'text-ramp' : 'text-ink'
          }`}
          title="Engel kalkmış — bildir"
        >
          <X size={13} aria-hidden="true" />
          Kalktı
        </button>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => onSelect(pin)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Haritada göster"
          >
            <Navigation size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onShare(pin)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Bildirimi paylaş"
          >
            <Share2 size={14} aria-hidden="true" />
          </button>
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete(pin.id)}
              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ramp"
              aria-label="Kendi bildirimini sil"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
