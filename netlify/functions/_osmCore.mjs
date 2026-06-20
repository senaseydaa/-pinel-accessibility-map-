// PINel — OpenStreetMap (Overpass) erişilebilir altyapı çekirdeği.
// Canlı/güncel topluluk verisi: asansör, rampa, hissedilebilir yüzey, erişilebilir
// tuvalet/otopark, erişilebilir/erişilemez yerler. Üsküdar Meydanı çevresi.

// Birden çok Overpass aynası — biri 504/yoğun olursa diğerine geç
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const BBOX = '41.019,29.004,41.035,29.026'; // S,W,N,E
const TTL = 60 * 60 * 1000; // OSM altyapısı yavaş değişir → 1 sa cache
const CAP = 160;

const QUERY = `[out:json][timeout:20];(
  nwr["highway"="elevator"](${BBOX});
  nwr["ramp"="yes"](${BBOX});
  nwr["kerb"](${BBOX});
  nwr["tactile_paving"](${BBOX});
  nwr["toilets:wheelchair"](${BBOX});
  nwr["amenity"="toilets"]["wheelchair"](${BBOX});
  nwr["capacity:disabled"](${BBOX});
  nwr["wheelchair"](${BBOX});
);out center tags;`;

const LABELS = {
  elevator: 'Asansör',
  tactile: 'Hissedilebilir yüzey',
  parking: 'Engelli otopark',
  toilet: 'Erişilebilir tuvalet',
  ramp: 'Rampa / indirilmiş kaldırım',
  accessible: 'Erişilebilir yer',
  inaccessible: 'Erişime kapalı',
};

let cache = null;

function classify(t) {
  if (t.highway === 'elevator') return 'elevator';
  if (t.tactile_paving && t.tactile_paving !== 'no') return 'tactile';
  if (t['capacity:disabled'] || (t.amenity === 'parking' && (t.wheelchair === 'yes' || t.wheelchair === 'designated'))) return 'parking';
  if (t['toilets:wheelchair'] === 'yes' || (t.amenity === 'toilets' && (t.wheelchair === 'yes' || t.wheelchair === 'limited'))) return 'toilet';
  if (t.ramp === 'yes' || t.kerb === 'lowered') return 'ramp';
  if (t.wheelchair === 'no') return 'inaccessible';
  if (t.wheelchair === 'yes' || t.wheelchair === 'limited') return 'accessible';
  return null;
}

async function runOverpass() {
  const opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Overpass UA olmayan istekleri 406 ile reddediyor (sunucu tarafı — UA serbest)
      'User-Agent': 'PINel/1.0 (Üsküdar accessibility map)',
      Accept: 'application/json',
    },
    body: 'data=' + encodeURIComponent(QUERY),
  };
  let lastErr;
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep, opts);
      if (res.ok) return await res.json();
      lastErr = new Error(`Overpass ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Overpass erişilemedi');
}

export async function getAccessibleInfra() {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const json = await runOverpass();
  const items = [];
  const byKind = {};
  for (const e of json.elements || []) {
    const t = e.tags || {};
    const kind = classify(t);
    if (!kind) continue;
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (!isFinite(lat) || !isFinite(lng)) continue;
    byKind[kind] = (byKind[kind] || 0) + 1;
    items.push({ id: `osm-${e.type}-${e.id}`, kind, label: LABELS[kind], name: t.name || t['name:tr'] || null, lat, lng });
    if (items.length >= CAP) break;
  }
  const data = { fetchedAt: new Date().toISOString(), count: items.length, byKind, items };
  cache = { at: Date.now(), data };
  return data;
}
