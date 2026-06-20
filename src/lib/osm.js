// OpenStreetMap erişilebilir altyapı (proxy üzerinden — /api/osm).
// Konuma göre: merkez (lat,lng) + yarıçap (m).
export async function fetchOsmInfra(lat, lng, radius) {
  const res = await fetch(`/api/osm?lat=${lat}&lng=${lng}&radius=${radius}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Altyapı verisi alınamadı (${res.status})`);
  return res.json();
}
