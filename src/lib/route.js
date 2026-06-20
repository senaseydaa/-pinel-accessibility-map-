// Engel-farkında erişilebilir rota (proxy üzerinden — /api/route).
// start/end: [lng, lat]; avoid: [[lng, lat], ...] (kaçınılacak engel noktaları).
export async function fetchRoute({ start, end, avoid }) {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end, avoid }),
  });
  if (!res.ok) throw new Error(`Rota bulunamadı (${res.status})`);
  return res.json();
}

export function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} dk`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

export function fmtDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
