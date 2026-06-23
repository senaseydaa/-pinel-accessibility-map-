// PINel — engel-farkında erişilebilir rota çekirdeği.
// ORS_API_KEY varsa: OpenRouteService "wheelchair" profili + canlı engelleri
// avoid_polygons olarak geçer (rota onların etrafından gider). Anahtar yoksa:
// anahtarsız OSRM "foot" profiline düşer (kaçınma olmadan, yalnızca yaya rotası).
// Koordinatlar [lng, lat] sırasında gelir/gider (GeoJSON standardı).

const AVOID_HALF = 0.00014; // ~15 m — her engelin etrafına kaçınma kutusu

async function orsRoute(start, end, avoid) {
  const key = process.env.ORS_API_KEY;
  const body = {
    coordinates: [start, end],
    instructions: true,
    language: 'tr',
  };
  if (avoid && avoid.length) {
    body.options = {
      avoid_polygons: {
        type: 'MultiPolygon',
        coordinates: avoid.map(([lng, lat]) => [
          [
            [lng - AVOID_HALF, lat - AVOID_HALF],
            [lng + AVOID_HALF, lat - AVOID_HALF],
            [lng + AVOID_HALF, lat + AVOID_HALF],
            [lng - AVOID_HALF, lat + AVOID_HALF],
            [lng - AVOID_HALF, lat - AVOID_HALF],
          ],
        ]),
      },
    };
  }
  const res = await fetch('https://api.openrouteservice.org/v2/directions/wheelchair/geojson', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS ${res.status}: ${txt.slice(0, 160)}`);
  }
  const gj = await res.json();
  const feat = gj.features?.[0];
  if (!feat) throw new Error('Erişilebilir rota bulunamadı.');
  const sum = feat.properties.summary || {};
  const steps = (feat.properties.segments || [])
    .flatMap((s) => s.steps || [])
    .map((st) => ({ instruction: st.instruction, distance: st.distance }));
  return {
    engine: 'ors-wheelchair',
    distance: sum.distance || 0,
    duration: sum.duration || 0,
    coords: feat.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // → Leaflet [lat,lng]
    steps,
    avoidCount: avoid ? avoid.length : 0,
  };
}

const OSRM_TYPE_TR = {
  depart: 'Yola çık',
  arrive: 'Varış',
  turn: 'Dön',
  'new name': 'Devam et',
  continue: 'Devam et',
  merge: 'Birleş',
  roundabout: 'Döner kavşak',
  fork: 'Ayrımda',
  'end of road': 'Yolun sonu',
};

async function osrmRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/foot/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PINel/1.0' } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const d = await res.json();
  if (d.code !== 'Ok' || !d.routes?.length) throw new Error('Rota bulunamadı.');
  const r = d.routes[0];
  const steps = (r.legs?.[0]?.steps || []).map((s) => {
    const t = s.maneuver?.type || '';
    const dir = OSRM_TYPE_TR[t] || 'Devam et';
    return { instruction: s.name ? `${dir} — ${s.name}` : dir, distance: s.distance };
  });
  return {
    engine: 'osrm-foot',
    distance: r.distance || 0,
    duration: r.duration || 0,
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    steps,
    avoidCount: 0,
  };
}

export async function getRoute({ start, end, avoid = [] }) {
  if (!Array.isArray(start) || !Array.isArray(end)) throw new Error('Başlangıç/hedef koordinatı eksik.');
  if (process.env.ORS_API_KEY) {
    try {
      return await orsRoute(start, end, avoid);
    } catch (e) {
      // ORS başarısızsa (kota, geçersiz anahtar) anahtarsız yaya rotasına düş
      const fallback = await osrmRoute(start, end);
      return { ...fallback, note: `ORS hatası: ${String(e.message || e).slice(0, 80)}` };
    }
  }
  return osrmRoute(start, end);
}
