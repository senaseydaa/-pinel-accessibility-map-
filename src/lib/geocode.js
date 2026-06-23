// Yer arama (proxy üzerinden — /api/geocode?text=...). Rota hedefi için.
export async function fetchGeocode(text) {
  const res = await fetch(`/api/geocode?text=${encodeURIComponent(text)}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Arama başarısız (${res.status})`);
  return res.json();
}
