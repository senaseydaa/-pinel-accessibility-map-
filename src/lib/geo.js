// Nokta bir halkanın (ring) içinde mi — ışın atma (ray casting). pt=[lat,lng].
function pointInRing(pt, ring) {
  const x = pt[1];
  const y = pt[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1];
    const yi = ring[i][0];
    const xj = ring[j][1];
    const yj = ring[j][0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Nokta, halkalardan herhangi birinin içinde mi (çok parçalı sınır için).
export function pointInRings(pt, rings) {
  return rings.some((r) => pointInRing(pt, r));
}

// İki koordinat arası mesafe (metre) — yakındaki mükerrer bildirimleri bulmak için.
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
