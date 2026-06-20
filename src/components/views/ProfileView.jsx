import { Sun, Moon } from 'lucide-react';
import { OBSTACLE_LIST } from '../../data/obstacleTypes.js';

// "Profil" görünümü — katkı puanı, tema, harita lejantı, kaynak/hakkında.
export default function ProfileView({ theme, onToggleTheme, points }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-3">
      <h2 className="text-sm font-bold text-ink">Profil</h2>

      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <p className="font-mono text-2xl font-extrabold text-ink">{points}</p>
        <p className="text-xs font-semibold text-muted">katkı puanınız</p>
        <p className="mt-1 text-[11px] text-muted">Bildirim +5 · oy +1</p>
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        className="btn-ghost mt-3 w-full justify-between"
      >
        <span>{theme === 'dark' ? 'Koyu tema' : 'Açık tema'}</span>
        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Harita lejantı</p>
        <div className="space-y-2 text-[12px] text-ink">
          {OBSTACLE_LIST.map((o) => {
            const Icon = o.Icon;
            return (
              <div key={o.key} className="flex items-center gap-2">
                <Icon size={15} style={{ color: o.color }} aria-hidden="true" />
                <span>{o.label} <span className="text-muted">(topluluk)</span></span>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-[3px] border-2" style={{ borderColor: '#DC2626' }} />
            <span>Resmî asansör/merdiven arızası <span className="text-muted">(Metro İstanbul)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: '#0F766E' }} />
            <span>Erişilebilir altyapı <span className="text-muted">(OSM: rampa, asansör, tuvalet…)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: '#DC2626' }} />
            <span>Erişime kapalı yer <span className="text-muted">(OSM)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand" />
            <span>Konumunuz</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        PINel — Üsküdar Meydanı erişilebilirlik haritası. Veri: topluluk bildirimleri +
        Metro İstanbul açık verisi. Engelsiz bir Üsküdar için.
      </p>
    </div>
  );
}
