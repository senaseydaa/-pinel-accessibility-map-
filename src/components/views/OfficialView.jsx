// "Resmî durum" görünümü — Metro İstanbul açık verisi (kendi alanında, ferah).
export default function OfficialView({ official, officialStatus, onRefreshOfficial, onFitOfficial }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-ink">Resmî erişim durumu</h2>
        <button type="button" onClick={onRefreshOfficial} className="text-[12px] font-semibold text-brand hover:underline">
          Yenile
        </button>
      </div>
      <p className="mt-0.5 text-xs text-muted">Metro İstanbul açık verisinden canlı</p>

      {officialStatus === 'loading' && <p className="mt-4 text-sm text-muted">Yükleniyor…</p>}
      {officialStatus === 'error' && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-sm text-ramp">
          Resmî veriye şu an ulaşılamıyor.
          <button type="button" onClick={onRefreshOfficial} className="ml-1 font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {officialStatus === 'success' && official && (
        <div className="mt-3 space-y-3">
          <div
            className={`rounded-xl border p-3 ${
              official.uskudar.accessible ? 'border-brand/30 bg-brand/5' : 'border-ramp/30 bg-ramp/5'
            }`}
          >
            <p className={`text-sm font-bold ${official.uskudar.accessible ? 'text-brand' : 'text-ramp'}`}>
              {official.uskudar.accessible
                ? 'Üsküdar: engelli erişimine uygun ✓'
                : `Üsküdar: erişim kısıtlı ⚠ (${official.uskudar.liftFaults} asansör arızalı)`}
            </p>
            <div className="mt-2 space-y-0.5 font-mono text-[12px] text-muted">
              <p>
                Asansör: {official.uskudar.liftOk}/{official.uskudar.liftTotal} çalışıyor
                {official.uskudar.liftFaults > 0 ? ` · ${official.uskudar.liftFaults} arıza` : ''}
              </p>
              <p>
                Yürüyen merdiven: {official.uskudar.escOk}/{official.uskudar.escTotal} çalışıyor
                {official.uskudar.escFaults > 0 ? ` · ${official.uskudar.escFaults} arıza` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3">
            <p className={`text-sm font-semibold ${official.service ? 'text-ramp' : 'text-ink'}`}>
              {official.service ? `M5 aksama: ${official.service.description}` : 'M5 hattı: normal çalışıyor ✓'}
            </p>
            <p className="mt-1 font-mono text-[12px] text-muted">
              M5 hattında {official.m5Count} ekipman arızalı · ağ geneli {official.networkTotal}
            </p>
            {official.m5Count > 0 && (
              <button
                type="button"
                onClick={onFitOfficial}
                className="btn-ghost mt-2 w-full text-[12px]"
              >
                M5 arızalarını haritada göster
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[3px] border-2" style={{ borderColor: '#DC2626' }} />
              Arıza
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[3px] border-2" style={{ borderColor: '#64748B' }} />
              Revizyon
            </span>
          </div>

          <p className="text-[11px] leading-snug text-muted">
            Kaynak: Metro İstanbul açık verisi ·{' '}
            {new Date(official.fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} güncellendi
          </p>
        </div>
      )}
    </div>
  );
}
