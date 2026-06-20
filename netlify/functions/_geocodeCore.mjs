// Adres/yer arama (ORS geocode autocomplete) — rota hedefi için yazınca öneri.
// Üsküdar'a odaklı, Türkiye sınırlı. Anahtar server tarafında.
const FOCUS = { lon: 29.0152, lat: 41.0268 }; // Üsküdar Meydanı

export async function getGeocode(text) {
  const q = (text || '').trim();
  if (q.length < 2) return { suggestions: [] };
  const key = process.env.ORS_API_KEY;
  if (!key) return { suggestions: [] }; // anahtarsız autocomplete yok
  const url =
    'https://api.openrouteservice.org/geocode/autocomplete' +
    `?api_key=${encodeURIComponent(key)}` +
    `&text=${encodeURIComponent(q)}` +
    `&focus.point.lon=${FOCUS.lon}&focus.point.lat=${FOCUS.lat}` +
    '&boundary.country=TR&size=6';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ORS geocode ${res.status}`);
  const d = await res.json();
  const suggestions = (d.features || [])
    .map((f) => ({
      label: f.properties?.label || f.properties?.name,
      coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], // [lat, lng]
    }))
    .filter((s) => s.label);
  return { suggestions };
}
