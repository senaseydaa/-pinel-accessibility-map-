// OpenStreetMap erişilebilir altyapı (proxy üzerinden — /api/osm).
export async function fetchOsmInfra() {
  const res = await fetch('/api/osm', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Altyapı verisi alınamadı (${res.status})`);
  return res.json();
}
