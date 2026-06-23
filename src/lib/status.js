// Topluluk onayına dayalı durum — admin yok, tamamen bağımsız oylarla.
export const CONFIRM_THRESHOLD = 2; // bu kadar bağımsız "hâlâ duruyor" → Doğrulandı
export const REFUTE_THRESHOLD = 2; // bu kadar bağımsız "kalktı" → topluluk kaldırır
export const MERGE_RADIUS_M = 35; // bu yarıçapta aynı kategori = mükerrer (birleştir)

export function getStatus(pin) {
  const confirms = pin.confirms || 0;
  if (confirms >= CONFIRM_THRESHOLD) {
    return { key: 'confirmed', label: 'Doğrulandı' };
  }
  return { key: 'pending', label: 'Doğrulanıyor' };
}
