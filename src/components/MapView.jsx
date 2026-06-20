import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Check, Trash2 } from 'lucide-react';
import { makeMarkerIcon, makeUserIcon } from '../lib/mapIcons.js';
import CategoryBadge from './CategoryBadge.jsx';
import { timeAgo, remaining } from '../lib/time.js';

// Harita örneğini dışarı verir (merkeze pin / konuma uçma için gerekir).
function MapReady({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    // İlk yerleşimden sonra boyutu doğrula (panel/sheet düzeni için).
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
  onMapReady,
  onPlace,
  onSelect,
  onConfirm,
  onDelete,
}) {
  return (
    <MapContainer
      center={center}
      zoom={17}
      maxZoom={19}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <MapReady onReady={onMapReady} />
      <ClickCapture active={reportMode} onPlace={onPlace} />
      <FlyTo target={flyTarget} />

      {userCoords && (
        <Marker position={userCoords} icon={makeUserIcon()} keyboard={false}>
          <Popup>
            <span className="text-sm font-semibold text-ink">Buradasınız</span>
          </Popup>
        </Marker>
      )}

      {pins.map((pin) => {
        const rem = remaining(pin.expiresAt, now);
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeMarkerIcon(pin.type, pin.id === selectedId)}
            eventHandlers={{ click: () => onSelect(pin) }}
          >
            <Popup>
              <div className="min-w-[12rem]">
                <CategoryBadge typeKey={pin.type} />
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{pin.notes}</p>
                <p className="mt-1.5 font-mono text-[11px] text-muted">
                  {timeAgo(pin.createdAt, now)} · kalan {rem.label}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirm(pin.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2"
                  >
                    <Check size={13} className="text-brand" aria-hidden="true" />
                    Hâlâ duruyor
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(pin.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2 hover:text-ramp"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Sil
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
