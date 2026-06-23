// Resmî Metro İstanbul verisi (proxy üzerinden — /api/metro).
export async function fetchMetro() {
  const res = await fetch('/api/metro', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Resmî veri alınamadı (${res.status})`);
  return res.json();
}

export function metroDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}
