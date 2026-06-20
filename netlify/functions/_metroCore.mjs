// PINel — Metro İstanbul resmî erişilebilirlik verisi çekirdeği.
// Hem Netlify Function'dan (prod) hem Vite dev middleware'inden (yerel) çağrılır.
// Tarayıcı bu gov API'sini doğrudan çağıramaz (CORS) — sunucu tarafında çekeriz.

const BASE = 'https://api.ibb.gov.tr/MetroIstanbul/api/MetroMobile/V2';
const USKUDAR_ID = 122; // Üsküdar (M5)
const TTL = 60 * 1000; // arıza/servis 60 sn cache
const STATION_TTL = 6 * 60 * 60 * 1000; // istasyon listesi 6 sa cache

let stationCache = null;
const faultCache = {}; // gruba göre
let serviceCache = null;

function unwrap(json) {
  // Yanıtlar { Success, Error, Data: [...] } ile sarmalı.
  return Array.isArray(json) ? json : json?.Data || [];
}

async function getStations() {
  if (stationCache && Date.now() - stationCache.at < STATION_TTL) return stationCache.dict;
  const res = await fetch(`${BASE}/GetStations`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GetStations ${res.status}`);
  const list = unwrap(await res.json());
  const dict = {};
  for (const s of list) {
    const d = s.DetailInfo || {};
    dict[s.Id] = {
      name: s.Description || s.Name,
      line: s.LineName,
      lat: parseFloat(d.Latitude),
      lng: parseFloat(d.Longitude),
      lift: Number(d.Lift) || 0,
      esc: Number(d.Escolator) || 0,
    };
  }
  stationCache = { at: Date.now(), dict };
  return dict;
}

async function getFaulty(group) {
  const c = faultCache[group];
  if (c && Date.now() - c.at < TTL) return c.equipments;
  const res = await fetch(`${BASE}/GetFaultyEquipmentDetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ EquipmentGroupName: group }),
  });
  if (!res.ok) throw new Error(`GetFaultyEquipmentDetails(${group}) ${res.status}`);
  const arr = unwrap(await res.json());
  const block = arr.find((x) => Array.isArray(x.Equipments));
  const equipments = block ? block.Equipments : [];
  faultCache[group] = { at: Date.now(), equipments };
  return equipments;
}

async function getServiceStatuses() {
  if (serviceCache && Date.now() - serviceCache.at < TTL) return serviceCache.data;
  try {
    const res = await fetch(`${BASE}/GetServiceStatuses`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error();
    const data = unwrap(await res.json());
    serviceCache = { at: Date.now(), data };
    return data;
  } catch {
    return []; // servis durumu kritik değil — boş geç
  }
}

// Üsküdar pilotu: Üsküdar (122) + Üsküdar'ın hattı M5'teki asansör VE yürüyen
// merdiven arızaları + Üsküdar envanterine göre canlı "engelsiz erişim" durumu.
export async function getMetroData() {
  const [stations, lifts, escs, services] = await Promise.all([
    getStations(),
    getFaulty('Asansör'),
    getFaulty('Yürüyen Merdiven'),
    getServiceStatuses(),
  ]);

  const usk = stations[USKUDAR_ID] || { lift: 0, esc: 0 };
  const items = [];
  const perStation = {};
  let liftFaults = 0;
  let escFaults = 0;

  for (const [group, equipments] of [
    ['asansor', lifts],
    ['merdiven', escs],
  ]) {
    for (const e of equipments) {
      const isU = e.StationId === USKUDAR_ID;
      if (e.LineName !== 'M5' && !isU) continue;
      const st = stations[e.StationId];
      if (!st || !isFinite(st.lat) || !isFinite(st.lng)) continue;
      if (isU) group === 'asansor' ? liftFaults++ : escFaults++;
      const n = (perStation[e.StationId] = (perStation[e.StationId] || 0) + 1);
      const offset = (n - 1) * 0.0003;
      items.push({
        id: `metro-${group}-${e.StationId}-${e.Description || n}`,
        group, // 'asansor' | 'merdiven'
        stationId: e.StationId,
        stationName: st.name || e.StationName,
        lineName: e.LineName,
        type: e.Type === 'Revizyon' ? 'Revizyon' : 'Arıza',
        date: e.Date,
        description: e.Description || null,
        lat: st.lat + offset,
        lng: st.lng + offset,
        isUskudar: isU,
      });
    }
  }

  const m5 = services.find((s) => s.LineName === 'M5' && s.Description);
  const service = m5 ? { description: m5.Description, updateDate: m5.UpdateDate } : null;

  return {
    fetchedAt: new Date().toISOString(),
    networkTotal: lifts.length + escs.length,
    uskudar: {
      liftTotal: usk.lift,
      liftFaults,
      liftOk: Math.max(0, usk.lift - liftFaults),
      escTotal: usk.esc,
      escFaults,
      escOk: Math.max(0, usk.esc - escFaults),
      accessible: liftFaults === 0, // step-free yol asansördür
    },
    m5Count: items.length,
    items,
    service,
  };
}
