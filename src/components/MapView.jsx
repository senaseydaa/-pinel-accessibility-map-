import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Check, X, Trash2, ArrowUpDown } from 'lucide-react';
import { makeMarkerIcon, makeUserIcon, makeOfficialIcon, makeInfraIcon } from '../lib/mapIcons.js';
import CategoryBadge from './CategoryBadge.jsx';
import { getType } from '../data/obstacleTypes.js';
import { getStatus } from '../lib/status.js';
import { timeAgo, remaining, daysSince } from '../lib/time.js';
import { metroDate } from '../lib/metro.js';

// Harita örneğini dışarı verir (merkeze pin / konuma uçma için gerekir).
function MapReady({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, onReady]);
  return null;
}

// Bildirim modunda haritaya tıklama → koordinat.
function ClickCapture({ active, onPlace }) {
  useMapEvents({
    click(e) {
      if (active) onPlace(e.latlng);
    },
  });
  return null;
}

// Programatik uçuş (kart/konum odağı). nonce değişince tetiklenir.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.coords) {
      map.flyTo(target.coords, target.zoom ?? map.getZoom(), { duration: 1.1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);
  return null;
}

export default function MapView({
  center,
  pins,
  selectedId,
  reportMode,
  flyTarget,
  userCoords,
  now,
  votes,
  voterId,
  officialItems = [],
  infraItems = [],
  onMapReady,
  onPlace,
  onSelect,
  onConfirm,
  onRefute,
  onDelete,
}) {
  return (
    <MapContainer center={center} zoom={17} maxZoom={19} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <MapReady onReady={onMapReady} />
      <ClickCapture active={reportMode} onPlace={onPlace} />
      <FlyTo target={flyTarget} />

      {infraItems.map((o) => (
        <Marker key={o.id} position={[o.lat, o.lng]} icon={makeInfraIcon(o.kind, o.name ? `${o.label}, ${o.name}` : o.label)} keyboard={false}>
          <Popup>
            <div className="min-w-[10rem]">
              <span className={`text-sm font-semibold ${o.kind === 'inaccessible' ? 'text-ramp' : 'text-brand'}`}>{o.label}</span>
              {o.name && <p className="text-[13px] text-ink">{o.name}</p>}
              <p className="mt-1 text-[11px] text-muted">Kaynak: OpenStreetMap</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {userCoords && (
        <Marker position={userCoords} icon={makeUserIcon()} keyboard={false}>
          <Popup>
            <span className="text-sm font-semibold text-ink">Buradasınız</span>
          </Popup>
        </Marker>
      )}

      {officialItems.map((o) => {
        const days = daysSince(o.date, now);
        return (
          <Marker
            key={o.id}
            position={[o.lat, o.lng]}
            icon={makeOfficialIcon(o.group, o.type, false, `${o.group === 'merdiven' ? 'Yürüyen Merdiven' : 'Asansör'} ${o.type}, ${o.stationName}`)}
          >
            <Popup>
              <div className="min-w-[12rem]">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  <ArrowUpDown size={15} style={{ color: o.type === 'Revizyon' ? '#64748B' : '#DC2626' }} aria-hidden="true" />
                  {o.group === 'merdiven' ? 'Yürüyen Merdiven' : 'Asansör'} · {o.type}
                </span>
                <p className="mt-1.5 text-[13px] text-ink">
                  {o.stationName} <span className="text-muted">({o.lineName})</span>
                </p>
                {o.description && <p className="font-mono text-[11px] text-muted">{o.description}</p>}
                <p className="mt-1.5 text-[11px] text-muted">
                  {metroDate(o.date)}
                  {days > 0 ? ` · ${days} gündür` : ''} · Kaynak: Metro İstanbul (resmî)
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {pins.map((pin) => {
        const rem = remaining(pin.expiresAt, now);
        const status = getStatus(pin);
        const myVote = votes[pin.id];
        const isOwn = pin.authorId === voterId;
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeMarkerIcon(pin.type, pin.id === selectedId, `${getType(pin.type).label}, ${status.label}, ${pin.confirms || 0} onay`)}
            eventHandlers={{ click: () => onSelect(pin) }}
          >
            <Popup>
              <div className="min-w-[13rem]">
                <div className="flex items-center justify-between gap-2">
                  <CategoryBadge typeKey={pin.type} />
                  <span className={`text-[10px] font-semibold ${status.key === 'confirmed' ? 'text-brand' : 'text-muted'}`}>
                    {status.label}
                  </span>
                </div>
                {pin.photo && (
                  <img
                    src={pin.photo}
                    alt={`${getType(pin.type).label} fotoğrafı`}
                    className="mt-2 h-24 w-full rounded-md border border-border object-cover"
                  />
                )}
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{pin.notes}</p>
                <p className="mt-1.5 font-mono text-[11px] text-muted">
                  {pin.confirms || 0} onay · {timeAgo(pin.createdAt, now)} · kalan {rem.label}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirm(pin.id)}
                    aria-pressed={myVote === 'confirm'}
                    className={`inline-flex min-h-[40px] items-center gap-1 rounded-md border border-border px-2.5 py-2 text-[12px] font-semibold hover:bg-surface-2 ${
                      myVote === 'confirm' ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    <Check size={14} aria-hidden="true" />
                    Hâlâ duruyor
                  </button>
                  <button
                    type="button"
                    onClick={() => onRefute(pin.id)}
                    aria-pressed={myVote === 'refute'}
                    className={`inline-flex min-h-[40px] items-center gap-1 rounded-md border border-border px-2.5 py-2 text-[12px] font-semibold hover:bg-surface-2 ${
                      myVote === 'refute' ? 'text-ramp' : 'text-ink'
                    }`}
                  >
                    <X size={14} aria-hidden="true" />
                    Kalktı
                  </button>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => onDelete(pin.id)}
                      className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-2 hover:text-ramp"
                      aria-label="Kendi bildirimini sil"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
