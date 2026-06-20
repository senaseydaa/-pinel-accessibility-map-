import { getType } from '../data/obstacleTypes.js';

// Kategori göstergesi: renkli ikon (grafik) + tema-mürekkebi etiket.
// Renk asla tek başına anlam taşımaz; ikon biçimi + metin birlikte verilir.
export default function CategoryBadge({ typeKey, iconSize = 15, className = '' }) {
  const t = getType(typeKey);
  const Icon = t.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-ink ${className}`}>
      <Icon size={iconSize} style={{ color: t.color }} aria-hidden="true" />
      <span>{t.label}</span>
    </span>
  );
}
