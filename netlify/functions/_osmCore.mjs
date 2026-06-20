// PINel — OpenStreetMap (Overpass) erişilebilir altyapı çekirdeği.
// Konuma göre yükler: harita merkezine belirli yarıçapta noktalar (gezdikçe yenilenir),
// böylece tüm Anadolu yakasında noktalara boğulmadan, karşı yaka yüklenmeden çalışır.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const TTL = 60 * 60 * 1000; // 1 sa cache
const CAP = 250;
const DEFAULT_RADIUS = 1500; // m
const MAX_RADIUS = 4000;

const LABELS = {
  elevator: 'Asansör',
  tactile: 'Hissedilebilir yüzey',
  parking: 'Engelli otopark',
  toilet: 'Erişilebilir tuvalet',
  ramp: 'Rampa / indirilmiş kaldırım',
  accessible: 'Erişilebilir yer',
  inaccessible: 'Erişime kapalı',
};

const cache = new Map(); // key → { at, data }

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

function buildQuery(lat, lng, radius) {
  const A = `(around:${radius},${lat},${lng})`;
  return `[out:json][timeout:20];(
    nwr["highway"="elevator"]${A};
    nwr["ramp"="yes"]${A};
    nwr["kerb"]${A};
    nwr["tactile_paving"]${A};
    nwr["toilets:wheelchair"]${A};
    nwr["amenity"="toilets"]["wheelchair"]${A};
    nwr["capacity:disabled"]${A};
    nwr["wheelchair"]${A};
  );out center tags;`;
}

async function runOverpass(query) {
  const opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PINel/1.0 (accessibility map)',
      Accept: 'application/json',
    },
    body: 'data=' + encodeURIComponent(query),
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

export async function getAccessibleInfra({ lat, lng, radius } = {}) {
  lat = Number(lat) || 41.0268;
  lng = Number(lng) || 29.0152;
  radius = Math.min(MAX_RADIUS, Number(radius) || DEFAULT_RADIUS);
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const json = await runOverpass(buildQuery(lat, lng, radius));
  const all = [];
  for (const e of json.elements || []) {
    const t = e.tags || {};
    const kind = classify(t);
    if (!kind) continue;
    const la = e.lat ?? e.center?.lat;
    const ln = e.lon ?? e.center?.lon;
    if (!isFinite(la) || !isFinite(ln)) continue;
    all.push({ id: `osm-${e.type}-${e.id}`, kind, label: LABELS[kind], name: t.name || t['name:tr'] || null, lat: la, lng: ln });
  }
  // Merkeze en yakın CAP kadarını tut
  all.sort((a, b) => (a.lat - lat) ** 2 + (a.lng - lng) ** 2 - ((b.lat - lat) ** 2 + (b.lng - lng) ** 2));
  const items = all.slice(0, CAP);
  const byKind = {};
  for (const i of items) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
  const data = { fetchedAt: new Date().toISOString(), center: [lat, lng], radius, count: items.length, total: all.length, byKind, items };
  if (cache.size > 30) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data;
}
