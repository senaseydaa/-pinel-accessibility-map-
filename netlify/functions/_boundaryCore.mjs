// Üsküdar ilçe sınırı (Nominatim) — haritada ilçeyi vurgulayıp dışını karartmak için.
// Sınır değişmez; bellek içinde süresiz cache (instance ömrü boyunca tek istek).
let cache = null;

export async function getBoundary() {
  if (cache) return cache;
  const url =
    'https://nominatim.openstreetmap.org/search?q=' +
    encodeURIComponent('Üsküdar, İstanbul') +
    '&format=json&polygon_geojson=1&limit=5&addressdetails=1';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PINel/1.0 (Üsküdar accessibility map)', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = await res.json();
  const item =
    arr.find(
      (r) => r.class === 'boundary' && r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon')
    ) || arr.find((r) => r.geojson);
  if (!item?.geojson) throw new Error('İlçe sınırı bulunamadı.');
  const g = item.geojson;
  // rings: her biri Leaflet [lat,lng] noktalarından oluşan dış halka
  const rings =
    g.type === 'Polygon'
      ? [g.coordinates[0].map(([lng, lat]) => [lat, lng])]
      : g.coordinates.map((poly) => poly[0].map(([lng, lat]) => [lat, lng]));
  cache = {
    name: (item.display_name || 'Üsküdar').split(',')[0],
    rings,
    bbox: item.boundingbox ? item.boundingbox.map(Number) : null, // [S, N, W, E]
  };
  return cache;
}
