import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Crosshair, Accessibility, Ship } from 'lucide-react';
import MapView from './components/MapView.jsx';
import Sidebar from './components/Sidebar.jsx';
import ReportModal from './components/ReportModal.jsx';
import Toast from './components/Toast.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { getType } from './data/obstacleTypes.js';
import { distanceMeters, pointInRings } from './lib/geo.js';
import { REFUTE_THRESHOLD, MERGE_RADIUS_M } from './lib/status.js';
import { fetchMetro } from './lib/metro.js';
import { fetchOsmInfra } from './lib/osm.js';
import { fetchRoute } from './lib/route.js';
import anadoluBoundary from './data/anadolu-boundary.json';
import transitHubs from './data/transit-hubs.json';

const MEYDAN = [41.0268, 29.0152];
// Bildirim ömrü kategoriye göre (dk) — kalıcı engeller (rampa/asansör) daha uzun
// yaşar; sokak çalışması daha çabuk değişir. "Hâlâ duruyor" oyu süreyi yeniler.
const LIFETIME = { rampa: 480, asansor: 480, calisma: 240 };
const lifetimeMin = (type) => LIFETIME[type] ?? 240;

// Üsküdar Meydanı çevresinden gerçekçi örnek bildirimler (yalnızca depo boşsa).
// authorId 'seed' — yani benim bildirimim değil; bu yüzden silemem, yalnızca oylayabilirim.
function seedPins() {
  const now = Date.now();
  const make = (agoMin, p) => ({
    refutes: 0,
    photo: null,
    authorId: 'seed',
    ...p,
    createdAt: new Date(now - agoMin * 60000).toISOString(),
    expiresAt: new Date(now - agoMin * 60000 + lifetimeMin(p.type) * 60000).toISOString(),
  });
  return [
    make(95, {
      id: 'seed-asansor',
      type: 'asansor',
      lat: 41.0264,
      lng: 29.0148,
      confirms: 3,
      notes: 'Marmaray ana çıkışındaki engelli asansörü arıza nedeniyle servis dışı.',
    }),
    make(200, {
      id: 'seed-rampa',
      type: 'rampa',
      lat: 41.0272,
      lng: 29.0156,
      confirms: 1,
      notes: 'Vapur iskelesi karşısındaki kaldırım rampasının önüne motosikletler park edilmiş.',
    }),
    make(25, {
      id: 'seed-calisma',
      type: 'calisma',
      lat: 41.0261,
      lng: 29.0162,
      confirms: 4,
      notes: 'Mihrimah Sultan Camii arkasındaki sokak çalışması tekerlekli sandalye geçişini kapatıyor.',
    }),
  ];
}

export default function App() {
  const [pins, setPins] = useLocalStorage('pinel.pins', seedPins);
  const [theme, setTheme] = useLocalStorage('pinel.theme', 'light');
  const [votes, setVotes] = useLocalStorage('pinel.votes', {});
  const [points, setPoints] = useLocalStorage('pinel.points', 0);
  const [voterId] = useLocalStorage('pinel.voterId', () => `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [reportMode, setReportMode] = useState(false);
  const [modalCoords, setModalCoords] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [official, setOfficial] = useState(null);
  const [officialStatus, setOfficialStatus] = useState('idle');
  const [activeView, setActiveView] = useState('reports');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [infra, setInfra] = useState(null);
  const [infraStatus, setInfraStatus] = useState('idle');
  const [showInfra, setShowInfra] = useState(false);
  const [showFerry, setShowFerry] = useState(false);
  const [routeStart, setRouteStart] = useState({ coords: MEYDAN, label: 'Üsküdar Meydanı' });
  const [routeEnd, setRouteEnd] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState('idle');
  const [pickingFor, setPickingFor] = useState(null);
  const [boundary] = useState(anadoluBoundary); // statik Anadolu yakası sınırı

  const { coords: userCoords, locate, status: geoStatus } = useGeolocation();

  const mapRef = useRef(null);
  const flyNonce = useRef(0);
  const toastId = useRef(0);
  const lastTrigger = useRef(null);
  const showInfraRef = useRef(false);
  const infraTimer = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Gerçek zamanlı saat + süresi dolanları temizle (30 sn'de bir)
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setPins((prev) => {
        const live = prev.filter((p) => new Date(p.expiresAt).getTime() > t);
        return live.length === prev.length ? prev : live;
      });
    };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [setPins]);

  // Paylaşılan bağlantıyı aç (?pin=...)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('pin');
    if (!id) return;
    const pin = pins.find((p) => p.id === id);
    if (pin) focusPin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resmî Metro İstanbul verisini açılışta çek
  useEffect(() => {
    loadOfficial();
  }, []);


  function loadOfficial() {
    setOfficialStatus('loading');
    fetchMetro()
      .then((data) => {
        setOfficial(data);
        setOfficialStatus('success');
      })
      .catch(() => setOfficialStatus('error'));
  }

  function fitAnadolu() {
    if (mapRef.current && boundary?.bbox) {
      mapRef.current.fitBounds(
        [
          [boundary.bbox[0], boundary.bbox[2]],
          [boundary.bbox[1], boundary.bbox[3]],
        ],
        { padding: [12, 12] }
      );
    }
  }

  function fitOfficial() {
    const items = official?.items || [];
    if (!items.length || !mapRef.current) return;
    mapRef.current.fitBounds(
      items.map((i) => [i.lat, i.lng]),
      { padding: [48, 48], maxZoom: 15 }
    );
    setSheetExpanded(false);
  }

  // Mevcut harita görünümü → merkez + yarıçap (yakınlaştıkça küçük, uzaklaştıkça büyük)
  function currentView() {
    const m = mapRef.current;
    if (!m) return { lat: MEYDAN[0], lng: MEYDAN[1], radius: 1500 };
    const c = m.getCenter();
    const ne = m.getBounds().getNorthEast();
    return { lat: c.lat, lng: c.lng, radius: Math.max(600, Math.min(4000, Math.round(c.distanceTo(ne)))) };
  }

  function loadInfra() {
    const v = currentView();
    setInfraStatus('loading');
    fetchOsmInfra(v.lat.toFixed(5), v.lng.toFixed(5), v.radius)
      .then((data) => {
        // Anadolu yakası dışındaki noktaları gizle
        const inside = boundary?.rings
          ? data.items.filter((i) => pointInRings([i.lat, i.lng], boundary.rings))
          : data.items;
        const byKind = {};
        inside.forEach((i) => (byKind[i.kind] = (byKind[i.kind] || 0) + 1));
        setInfra({ ...data, items: inside, byKind, count: inside.length });
        setInfraStatus('success');
      })
      .catch((err) => {
        setInfraStatus('error');
        showToast(err.message, 'error');
      });
  }

  function toggleInfra() {
    const next = !showInfra;
    setShowInfra(next);
    showInfraRef.current = next;
    if (next) loadInfra();
  }

  function focusInfra(coords) {
    setShowInfra(true);
    showInfraRef.current = true;
    fly(coords, 17);
    setSheetExpanded(false); // fly → moveend → otomatik yeniden yükler
  }

  // Harita gezilince (katman açıksa) yakındaki altyapıyı yeniden yükle
  function handleMapMove() {
    if (!showInfraRef.current) return;
    clearTimeout(infraTimer.current);
    infraTimer.current = setTimeout(loadInfra, 700);
  }

  function showToast(message, type = 'success') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  function fly(coords, zoom) {
    flyNonce.current += 1;
    setFlyTarget({ coords, zoom, nonce: flyNonce.current });
  }

  function focusPin(pin) {
    setSelectedId(pin.id);
    fly([pin.lat, pin.lng], 18);
    setSheetExpanded(false);
  }

  function selectView(key) {
    if (key === activeView) {
      // aynı ikona tekrar tıklama → paneli aç/kapat
      setPanelCollapsed((c) => !c);
      setSheetExpanded((e) => !e);
    } else {
      setActiveView(key);
      setPanelCollapsed(false);
      setSheetExpanded(true);
      if (key === 'altyapi') loadInfra();
    }
  }

  function openReport(coords) {
    lastTrigger.current = document.activeElement;
    setModalCoords(coords);
  }

  function closeReport() {
    setModalCoords(null);
    if (lastTrigger.current && lastTrigger.current.focus) lastTrigger.current.focus();
  }

  function handlePlace(latlng) {
    if (pickingFor) {
      const coords = [latlng.lat, latlng.lng];
      if (pickingFor === 'start') setRouteStart({ coords, label: 'Seçilen nokta' });
      else setRouteEnd({ coords, label: 'Seçilen nokta' });
      setPickingFor(null);
      return;
    }
    openReport({ lat: latlng.lat, lng: latlng.lng });
  }

  // --- Rota (engel-farkında erişilebilir) ---
  function buildAvoid() {
    const a = pins.map((p) => [p.lng, p.lat]);
    if (infra?.items) a.push(...infra.items.filter((i) => i.kind === 'inaccessible').map((i) => [i.lng, i.lat]));
    return a;
  }

  function computeRoute(s, e) {
    if (!s || !e) return;
    setActiveView('route');
    setPanelCollapsed(false);
    setRouteStatus('loading');
    fetchRoute({ start: [s.coords[1], s.coords[0]], end: [e.coords[1], e.coords[0]], avoid: buildAvoid() })
      .then((r) => {
        setRoute(r);
        setRouteStatus('success');
        if (mapRef.current && r.coords?.length) mapRef.current.fitBounds(r.coords, { padding: [56, 56] });
        setSheetExpanded(false);
      })
      .catch((err) => {
        setRouteStatus('error');
        showToast(err.message, 'error');
      });
  }

  function routeUseLocation() {
    locate()
      .then((coords) => setRouteStart({ coords, label: 'Konumunuz' }))
      .catch((err) => showToast(err.message, 'error'));
  }
  function routePick(which) {
    setPickingFor(which);
    setSheetExpanded(false);
    showToast('Haritada bir noktaya dokunun.', 'info');
  }
  function routeTo(coords, label) {
    const e = { coords, label };
    setRouteEnd(e);
    computeRoute(routeStart, e);
  }

  function dropPinAtCenter() {
    const c = mapRef.current?.getCenter();
    if (c) openReport({ lat: c.lat, lng: c.lng });
  }

  function freshExpiry(type) {
    return new Date(Date.now() + lifetimeMin(type) * 60000).toISOString();
  }

  function saveObstacle(type, notes, photo) {
    if (!modalCoords) return;
    const coords = [modalCoords.lat, modalCoords.lng];

    // Mükerrer birleştirme: yakında (MERGE_RADIUS_M) aynı kategori varsa yeni pin
    // açma — mevcut bildirimi doğrula (+1 onay).
    const dup = pins.find(
      (p) => p.type === type && distanceMeters([p.lat, p.lng], coords) <= MERGE_RADIUS_M
    );
    if (dup) {
      setPins((prev) =>
        prev.map((p) => (p.id === dup.id ? { ...p, confirms: (p.confirms || 0) + 1, expiresAt: freshExpiry(dup.type) } : p))
      );
      setVotes((v) => ({ ...v, [dup.id]: 'confirm' }));
      setModalCoords(null);
      setReportMode(false);
      focusPin(dup);
      setPoints((p) => p + 1);
      showToast('Yakında aynı bildirim vardı — onu doğruladınız. (+1 onay)');
      return;
    }

    const created = Date.now();
    const pin = {
      id: `pin-${created}`,
      type,
      lat: modalCoords.lat,
      lng: modalCoords.lng,
      notes: notes || 'Açıklama eklenmedi.',
      photo: photo || null,
      authorId: voterId,
      confirms: 1, // sahibinin kendi onayı
      refutes: 0,
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + lifetimeMin(type) * 60000).toISOString(),
    };
    setPins((prev) => [pin, ...prev]);
    setVotes((v) => ({ ...v, [pin.id]: 'confirm' }));
    setModalCoords(null);
    setReportMode(false);
    focusPin(pin);
    setPoints((p) => p + 5);
    showToast(`${getType(type).label} eklendi. (+5 puan)`);
  }

  // Bağımsız topluluk oyu (admin yok). Aynı oy tekrarlanamaz; oy değiştirilebilir.
  function castVote(pinId, kind) {
    const prev = votes[pinId];
    if (prev === kind) {
      showToast('Bu bildirimi zaten oyladınız.', 'info');
      return;
    }
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;

    let confirms = pin.confirms || 0;
    let refutes = pin.refutes || 0;
    if (prev === 'confirm') confirms = Math.max(0, confirms - 1);
    if (prev === 'refute') refutes = Math.max(0, refutes - 1);
    if (kind === 'confirm') confirms += 1;
    else refutes += 1;

    const willRemove = kind === 'refute' && refutes >= REFUTE_THRESHOLD;

    if (willRemove) {
      setPins((prevPins) => prevPins.filter((p) => p.id !== pinId));
      if (selectedId === pinId) setSelectedId(null);
    } else {
      setPins((prevPins) =>
        prevPins.map((p) =>
          p.id === pinId
            ? { ...p, confirms, refutes, ...(kind === 'confirm' ? { expiresAt: freshExpiry(pin.type) } : {}) }
            : p
        )
      );
    }
    setVotes((v) => ({ ...v, [pinId]: kind }));
    const earned = !prev ? ' (+1 puan)' : '';
    if (!prev) setPoints((p) => p + 1);

    if (willRemove) showToast(`Yeterli "kalktı" oyu — bildirim topluluk tarafından kaldırıldı.${earned}`);
    else if (kind === 'confirm') showToast(`Doğruladınız, süre yenilendi.${earned}`);
    else showToast(`"Kalktı" oyunuz alındı.${earned}`);
  }

  function deletePin(id) {
    const pin = pins.find((p) => p.id === id);
    if (!pin || pin.authorId !== voterId) return; // yalnızca kendi bildirimini silebilir
    setPins((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    showToast('Bildiriminiz silindi.');
  }

  async function sharePin(pin) {
    const url = `${window.location.origin}${window.location.pathname}?pin=${pin.id}`;
    const text = `PINel — ${getType(pin.type).label} (Üsküdar)`;
    try {
      if (navigator.share) await navigator.share({ title: 'PINel', text, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Bağlantı panoya kopyalandı.');
      }
    } catch {
      /* kullanıcı iptal etti */
    }
  }

  function toggleReport() {
    // Yan etkiyi updater dışında çalıştır — StrictMode updater'ı iki kez çağırınca
    // çift toast çıkıyordu.
    const next = !reportMode;
    setReportMode(next);
    if (next) {
      setSheetExpanded(false);
      showToast('Bildirim modu açık. Haritada bir noktaya dokunun ya da Sekme ile "Merkeze pin bırak" / "Konumumdan" düğmelerine gidin.', 'info');
    }
  }

  function reportHere() {
    locate()
      .then((coords) => {
        fly(coords, 18);
        if (!reportMode) setReportMode(true);
        openReport({ lat: coords[0], lng: coords[1] });
      })
      .catch((err) => showToast(err.message, 'error'));
  }

  function locateMe() {
    locate()
      .then((coords) => {
        fly(coords, 18);
        showToast('Konumunuza gidildi.');
      })
      .catch((err) => showToast(err.message, 'error'));
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  const counts = useMemo(() => {
    const c = { total: pins.length, rampa: 0, asansor: 0, calisma: 0, diger: 0 };
    pins.forEach((p) => {
      if (c[p.type] != null) c[p.type] += 1;
    });
    return c;
  }, [pins]);

  const filteredPins = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return pins.filter((p) => {
      if (filter !== 'all' && p.type !== filter) return false;
      if (!q) return true;
      return `${p.notes} ${getType(p.type).label}`.toLocaleLowerCase('tr').includes(q);
    });
  }, [pins, filter, query]);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-bg text-ink">
      <a
        href="#bildirim-paneli"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[1400] focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Bildirim paneline geç
      </a>
      <h1 className="sr-only">PINel — İstanbul Anadolu Yakası erişilebilirlik haritası</h1>

      <main className={`absolute inset-0 lg:relative lg:flex-1 ${reportMode || pickingFor ? 'reporting cursor-crosshair' : ''}`}>
        <MapView
          center={MEYDAN}
          pins={pins}
          selectedId={selectedId}
          reportMode={reportMode || !!pickingFor}
          flyTarget={flyTarget}
          userCoords={userCoords}
          now={now}
          votes={votes}
          voterId={voterId}
          officialItems={official?.items || []}
          infraItems={showInfra ? infra?.items || [] : []}
          ferryItems={showFerry ? transitHubs : []}
          route={route}
          routeStart={routeStart?.coords}
          routeEnd={routeEnd?.coords}
          boundary={boundary}
          onMapReady={(m) => {
            mapRef.current = m;
            fitAnadolu();
          }}
          onPlace={handlePlace}
          onMapMove={handleMapMove}
          onSelect={focusPin}
          onConfirm={(id) => castVote(id, 'confirm')}
          onRefute={(id) => castVote(id, 'refute')}
          onDelete={deletePin}
          onRouteTo={routeTo}
        />

        {reportMode && (
          <div className="pointer-events-auto absolute left-1/2 top-3 z-[600] flex max-w-[calc(100%-6rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-ramp/40 bg-surface px-2 py-1.5 shadow-card">
            <span className="px-1 text-xs font-semibold text-ramp">Engel nerede?</span>
            <button
              type="button"
              onClick={dropPinAtCenter}
              className="rounded-full bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              Merkeze pin
            </button>
            <button
              type="button"
              onClick={reportHere}
              className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
            >
              Konumumdan
            </button>
          </div>
        )}

        <div className="absolute right-3 top-3 z-[600] flex flex-col gap-2">
          <button
            type="button"
            onClick={locateMe}
            className="icon-btn shadow-card"
            aria-label="Konumumu bul"
            aria-busy={geoStatus === 'loading'}
          >
            <LocateFixed size={17} />
          </button>
          <button
            type="button"
            onClick={fitAnadolu}
            className="icon-btn shadow-card"
            aria-label="Anadolu yakasını göster"
          >
            <Crosshair size={17} />
          </button>
          <button
            type="button"
            onClick={toggleInfra}
            className={`icon-btn shadow-card ${showInfra ? 'border-brand text-brand' : ''}`}
            aria-label="Erişilebilir altyapı katmanını göster/gizle"
            aria-pressed={showInfra}
            aria-busy={infraStatus === 'loading'}
          >
            <Accessibility size={17} />
          </button>
          <button
            type="button"
            onClick={() => setShowFerry((v) => !v)}
            className={`icon-btn shadow-card ${showFerry ? 'border-brand text-brand' : ''}`}
            aria-label="İskele erişilebilirlik katmanını göster/gizle"
            aria-pressed={showFerry}
          >
            <Ship size={17} />
          </button>
        </div>
      </main>

      <aside
        id="bildirim-paneli"
        className={`fixed inset-x-0 bottom-0 z-[1000] flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-sheet lg:static lg:h-full lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none lg:transition-[width] ${
          panelCollapsed ? 'lg:w-14' : 'lg:w-96'
        }`}
        aria-label="Bildirim paneli"
      >
        <Sidebar
          activeView={activeView}
          onView={selectView}
          counts={counts}
          points={points}
          official={official}
          officialStatus={officialStatus}
          onRefreshOfficial={loadOfficial}
          onFitOfficial={fitOfficial}
          infra={infra}
          infraStatus={infraStatus}
          onRefreshInfra={loadInfra}
          showInfra={showInfra}
          onToggleInfra={toggleInfra}
          infraFrom={infra?.center || userCoords || MEYDAN}
          onFocusInfra={focusInfra}
          routeStart={routeStart}
          routeEnd={routeEnd}
          route={route}
          routeStatus={routeStatus}
          pickingFor={pickingFor}
          onRouteUseLocation={routeUseLocation}
          onRouteUseMeydan={() => setRouteStart({ coords: MEYDAN, label: 'Üsküdar Meydanı' })}
          onRoutePickStart={() => routePick('start')}
          onRoutePickDest={() => routePick('dest')}
          onRouteSetStart={(p) => setRouteStart({ coords: p.coords, label: p.name })}
          onRouteSetPreset={(p) => setRouteEnd({ coords: p.coords, label: p.name })}
          onRouteCompute={() => computeRoute(routeStart, routeEnd)}
          onRouteClear={() => {
            setRoute(null);
            setRouteEnd(null);
            setRouteStatus('idle');
          }}
          reportMode={reportMode}
          onToggleReport={toggleReport}
          query={query}
          onQuery={setQuery}
          filter={filter}
          onFilter={setFilter}
          pins={filteredPins}
          totalCount={pins.length}
          selectedId={selectedId}
          now={now}
          votes={votes}
          voterId={voterId}
          onSelect={focusPin}
          onConfirm={(id) => castVote(id, 'confirm')}
          onRefute={(id) => castVote(id, 'refute')}
          onShare={sharePin}
          onDelete={deletePin}
          theme={theme}
          onToggleTheme={toggleTheme}
          sheetExpanded={sheetExpanded}
          onToggleSheet={() => setSheetExpanded((v) => !v)}
          panelCollapsed={panelCollapsed}
        />
      </aside>

      {modalCoords && <ReportModal coords={modalCoords} onClose={closeReport} onSave={saveObstacle} />}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
