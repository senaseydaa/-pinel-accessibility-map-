// PINel — Metro İstanbul resmî asansör-arıza verisi çekirdeği.
// Hem Netlify Function'dan (prod) hem Vite dev middleware'inden (yerel) çağrılır.
// Tarayıcı bu gov API'sini doğrudan çağıramaz (CORS) — sunucu tarafında çekeriz.

const BASE = 'https://api.ibb.gov.tr/MetroIstanbul/api/MetroMobile/V2';
const USKUDAR_ID = 122; // Üsküdar (M5)
const FAULT_TTL = 60 * 1000; // arıza verisi 60 sn cache
const STATION_TTL = 6 * 60 * 60 * 1000; // istasyon listesi 6 sa cache (nadiren değişir)

let stationCache = null;
let faultCache = null;

async function getStations() {
  if (stationCache && Date.now() - stationCache.at < STATION_TTL) return stationCache.dict;
  const res = await fetch(`${BASE}/GetStations`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GetStations ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json?.Data || []; // yanıt { Data: [...] } sarmalı
  const dict = {};
  for (const s of list) {
    const d = s.DetailInfo || {};
    dict[s.Id] = {
      name: s.Description || s.Name,
      line: s.LineName,
      lat: parseFloat(d.Latitude),
      lng: parseFloat(d.Longitude),
      lift: d.Lift,
    };
  }
  stationCache = { at: Date.now(), dict };
  return dict;
}

async function getFaultyAsansor() {
  if (faultCache && Date.now() - faultCache.at < FAULT_TTL) return faultCache.equipments;
  const res = await fetch(`${BASE}/GetFaultyEquipmentDetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ EquipmentGroupName: 'Asansör' }),
  });
  if (!res.ok) throw new Error(`GetFaultyEquipmentDetails ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json?.Data || []; // yanıt { Data: [...] } sarmalı
  const block = arr.find((x) => Array.isArray(x.Equipments));
  const equipments = block ? block.Equipments : [];
  faultCache = { at: Date.now(), equipments };
  return equipments;
}

// Üsküdar pilotu: Üsküdar (122) + Üsküdar'ın hattı M5'teki asansör arızaları,
// istasyon koordinatlarına eşlenmiş. Ağ geneli toplam da bağlam için döner.
export async function getMetroData() {
  const [stations, equipments] = await Promise.all([getStations(), getFaultyAsansor()]);
  const perStation = {};
  const uskudar = [];
  const m5 = [];

  for (const e of equipments) {
    const isUskudar = e.StationId === USKUDAR_ID;
    if (e.LineName !== 'M5' && !isUskudar) continue;
    const st = stations[e.StationId];
    if (!st || !isFinite(st.lat) || !isFinite(st.lng)) continue;

    const n = (perStation[e.StationId] = (perStation[e.StationId] || 0) + 1);
    const offset = (n - 1) * 0.00025; // aynı istasyondaki birden çok asansörü ayır
    const item = {
      id: `metro-${e.StationId}-${e.Description || n}`,
      stationId: e.StationId,
      stationName: st.name || e.StationName,
      lineName: e.LineName,
      type: e.Type === 'Revizyon' ? 'Revizyon' : 'Arıza',
      date: e.Date,
      description: e.Description || null,
      lat: st.lat + offset,
      lng: st.lng + offset,
      isUskudar,
    };
    (isUskudar ? uskudar : m5).push(item);
  }

  const items = [...uskudar, ...m5];
  return {
    fetchedAt: new Date().toISOString(),
    networkTotal: equipments.length,
    uskudarCount: uskudar.length,
    m5Count: items.length,
    items,
  };
}
