// Gerçek zamanlı saat yardımcıları (sabit kodlu tarih yok).

export function timeAgo(iso, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h} sa ${m} dk önce` : `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export function remaining(expiresAtIso, now = Date.now()) {
  const ms = new Date(expiresAtIso).getTime() - now;
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return { min, expired: ms <= 0, label: h ? `${h} sa ${m} dk` : `${m} dk` };
}

export function formatClock(iso) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
