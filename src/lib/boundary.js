// Üsküdar ilçe sınırı (proxy üzerinden — /api/boundary).
export async function fetchBoundary() {
  const res = await fetch('/api/boundary', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Sınır alınamadı (${res.status})`);
  return res.json();
}
