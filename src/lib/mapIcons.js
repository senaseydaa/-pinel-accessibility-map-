import L from 'leaflet';
import { getType } from '../data/obstacleTypes.js';

// HTML attribute için güvenli metin (ekran okuyucu aria-label'ları)
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Kategoriye göre ayırt edici (yalnızca renge bağlı olmayan) iç çizim — renk
// körü kullanıcılar için biçim de farklılaşır.
function glyph(key, color) {
  if (key === 'asansor') {
    return `<path d="M16 9.6l-2.4 2.9h4.8z" fill="${color}"/><path d="M16 19.4l2.4-2.9h-4.8z" fill="${color}"/>`;
  }
  if (key === 'calisma') {
    return `<path d="M16 10.2l3.7 6.6H12.3z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/><circle cx="16" cy="15.2" r="0.95" fill="${color}"/>`;
  }
  // rampa — eğimli rampa biçimi
  return `<path d="M12 17.6 L20 11.8" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/><path d="M11.8 17.8 H20.2" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>`;
}

// Düz damla pin: kategori renkli dolgu, beyaz iç daire, ince beyaz dış hat,
// nötr gri gölge (renkli glow DEĞİL). Seçiliyken mürekkep renginde halka.
function pinSvg(color, key, selected, label) {
  const ring = selected
    ? '<circle cx="16" cy="14.5" r="9.2" fill="none" stroke="#14181C" stroke-width="2"/>'
    : '';
  return `
  <svg width="34" height="44" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"
       role="img" aria-label="${esc(label)}"
       style="filter: drop-shadow(0 2px 2px rgba(20,24,28,0.35));">
    <path d="M16 1C8.27 1 2 7.16 2 14.5C2 23.9 16 41 16 41C16 41 30 23.9 30 14.5C30 7.16 23.73 1 16 1Z"
          fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="16" cy="14.5" r="6.6" fill="#ffffff"/>
    ${glyph(key, color)}
    ${ring}
  </svg>`;
}

export function makeMarkerIcon(typeKey, selected = false, label) {
  const t = getType(typeKey);
  return L.divIcon({
    className: 'pinel-marker',
    html: pinSvg(t.color, t.key, selected, label || t.label),
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40],
  });
}

// Resmî (Metro İstanbul) ekipman arızası — topluluk pininden ayırt edilsin diye
// damla değil KARE plaka; Arıza kırmızı, Revizyon gri (biçim + renk birlikte).
// İç çizim ekipmana göre değişir: asansör = ok, yürüyen merdiven = basamak.
function officialGlyph(group, color) {
  if (group === 'merdiven') {
    return `<path d="M9.5 20.5h3v-3h3v-3h3v-3h2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  return `<path d="M15 8.4l-2.7 3.3h5.4z" fill="${color}"/><path d="M15 21.6l2.7-3.3h-5.4z" fill="${color}"/>`;
}

export function makeOfficialIcon(group, type, selected = false, label) {
  const color = type === 'Revizyon' ? '#64748B' : '#DC2626';
  const stroke = selected ? '#14181C' : color;
  return L.divIcon({
    className: 'pinel-marker',
    html: `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-label="${esc(label || (group === 'merdiven' ? 'Yürüyen merdiven' : 'Asansör') + ' ' + type)}"
         style="filter: drop-shadow(0 2px 2px rgba(20,24,28,0.35));">
      <rect x="3" y="3" width="24" height="24" rx="6" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
      ${officialGlyph(group, color)}
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

// OSM erişilebilir altyapı — küçük nokta katmanı (damla/kareden ayrı, daha sönük).
// Erişilebilir altyapı teal, "erişime kapalı" kırmızı.
export function makeInfraIcon(kind, label) {
  const color = kind === 'inaccessible' ? '#DC2626' : '#0F766E';
  return L.divIcon({
    className: 'pinel-marker',
    html: `<div role="img" aria-label="${esc(label || kind)}" style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 2px rgba(20,24,28,0.3);"></div>`,
    iconSize: [13, 13],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

// Rota başlangıç/hedef işareti.
export function makeRoutePoint(kind) {
  const color = kind === 'start' ? '#0F766E' : '#EA580C';
  const label = kind === 'start' ? 'Rota başlangıcı' : 'Rota hedefi';
  return L.divIcon({
    className: 'pinel-marker',
    html: `<div role="img" aria-label="${label}" style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 4px rgba(20,24,28,0.45);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

// "Konumumuz" işareti — marka renginde sade nokta + beyaz halka.
export function makeUserIcon() {
  return L.divIcon({
    className: 'pinel-marker',
    html: `
    <div style="width:18px;height:18px;border-radius:50%;background:#0F766E;border:3px solid #fff;
                box-shadow:0 1px 3px rgba(20,24,28,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
