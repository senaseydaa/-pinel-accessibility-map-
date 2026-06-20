import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Crosshair } from 'lucide-react';
import MapView from './components/MapView.jsx';
import Sidebar from './components/Sidebar.jsx';
import ReportModal from './components/ReportModal.jsx';
import Toast from './components/Toast.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { getType } from './data/obstacleTypes.js';

const MEYDAN = [41.0268, 29.0152];
const LIFETIME_MIN = 240; // Bildirimler 4 saat canlı kalır; "Hâlâ duruyor" yeniler.

// Üsküdar Meydanı çevresinden gerçekçi örnek bildirimler (yalnızca depo boşsa).
function seedPins() {
  const now = Date.now();
  const make = (agoMin, p) => ({
    ...p,
    createdAt: new Date(now - agoMin * 60000).toISOString(),
    expiresAt: new Date(now - agoMin * 60000 + LIFETIME_MIN * 60000).toISOString(),
  });
  return [
    make(95, {
      id: 'seed-asansor',
      type: 'asansor',
      lat: 41.0264,
      lng: 29.0148,
      notes: 'Marmaray ana çıkışındaki engelli asansörü arıza nedeniyle servis dışı.',
    }),
    make(200, {
      id: 'seed-rampa',
      type: 'rampa',
      lat: 41.0272,
      lng: 29.0156,
      notes: 'Vapur iskelesi karşısındaki kaldırım rampasının önüne motosikletler park edilmiş.',
    }),
    make(25, {
      id: 'seed-calisma',
      type: 'calisma',
      lat: 41.0261,
      lng: 29.0162,
      notes: 'Mihrimah Sultan Camii arkasındaki sokak çalışması tekerlekli sandalye geçişini kapatıyor.',
    }),
  ];
}

export default function App() {
  const [pins, setPins] = useLocalStorage('pinel.pins', seedPins);
  const [theme, setTheme] = useLocalStorage('pinel.theme', 'light');

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [reportMode, setReportMode] = useState(false);
  const [modalCoords, setModalCoords] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const { coords: userCoords, locate, status: geoStatus } = useGeolocation();

  const mapRef = useRef(null);
  const flyNonce = useRef(0);
  const toastId = useRef(0);
  const lastTrigger = useRef(null);

  // Tema sınıfını uygula
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
    setSheetExpanded(false); // mobilde haritayı göster
  }

  function openReport(coords) {
    lastTrigger.current = document.activeElement;
    setModalCoords(coords);
  }

  function closeReport() {
    setModalCoords(null);
    // Odağı tetikleyen öğeye geri ver
    if (lastTrigger.current && lastTrigger.current.focus) {
      lastTrigger.current.focus();
    }
  }

  function handlePlace(latlng) {
    openReport({ lat: latlng.lat, lng: latlng.lng });
  }

  function dropPinAtCenter() {
    const c = mapRef.current?.getCenter();
    if (c) openReport({ lat: c.lat, lng: c.lng });
  }

  function saveObstacle(type, notes) {
    if (!modalCoords) return;
    const created = Date.now();
    const pin = {
      id: `pin-${created}`,
      type,
      lat: modalCoords.lat,
      lng: modalCoords.lng,
      notes: notes || 'Açıklama eklenmedi.',
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + LIFETIME_MIN * 60000).toISOString(),
    };
    setPins((prev) => [pin, ...prev]);
    setModalCoords(null);
    setReportMode(false);
    focusPin(pin);
    showToast(`${getType(type).label} haritaya eklendi.`);
  }

  function confirmPin(id) {
    setPins((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, expiresAt: new Date(Date.now() + LIFETIME_MIN * 60000).toISOString() } : p
      )
    );
    showToast('Bildirim hâlâ geçerli olarak işaretlendi.');
  }

  function deletePin(id) {
    setPins((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    showToast('Bildirim silindi.');
  }

  async function sharePin(pin) {
    const url = `${window.location.origin}${window.location.pathname}?pin=${pin.id}`;
    const text = `PINel — ${getType(pin.type).label} (Üsküdar)`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PINel', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Bağlantı panoya kopyalandı.');
      }
    } catch {
      /* kullanıcı paylaşımı iptal etti — sessizce geç */
    }
  }

  function toggleReport() {
    setReportMode((v) => {
      const next = !v;
      if (next) {
        setSheetExpanded(false);
        showToast('Bildirim modu açık. Haritada engelin olduğu yere dokunun.', 'info');
      }
      return next;
    });
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

  // Türetilmiş veriler
  const counts = useMemo(() => {
    const c = { total: pins.length, rampa: 0, asansor: 0, calisma: 0 };
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
      const hay = `${p.notes} ${getType(p.type).label}`.toLocaleLowerCase('tr');
      return hay.includes(q);
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

      {/* Harita alanı */}
      <main className={`absolute inset-0 lg:static lg:flex-1 ${reportMode ? 'cursor-crosshair' : ''}`}>
        <MapView
          center={MEYDAN}
          pins={pins}
          selectedId={selectedId}
          reportMode={reportMode}
          flyTarget={flyTarget}
          userCoords={userCoords}
          now={now}
          onMapReady={(m) => {
            mapRef.current = m;
          }}
          onPlace={handlePlace}
          onSelect={focusPin}
          onConfirm={confirmPin}
          onDelete={deletePin}
        />

        {/* Durum şeridi */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-[600] flex max-w-[calc(100%-7rem)] -translate-x-1/2 justify-center">
          <p
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-card ${
              reportMode
                ? 'border-ramp/40 bg-surface text-ramp'
                : 'border-border bg-surface text-muted'
            }`}
          >
            {reportMode ? 'Engelin olduğu noktaya dokunun' : 'Üsküdar Meydanı · canlı erişilebilirlik katmanı'}
          </p>
        </div>

        {/* Harita kontrolleri */}
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
            onClick={() => fly(MEYDAN, 17)}
            className="icon-btn shadow-card"
            aria-label="Üsküdar Meydanı'na dön"
          >
            <Crosshair size={17} />
          </button>
        </div>
      </main>

      {/* Yan panel / mobil alt çekmece */}
      <aside
        id="bildirim-paneli"
        className="fixed inset-x-0 bottom-0 z-[1000] flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-sheet lg:static lg:h-full lg:max-h-none lg:w-96 lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none"
        aria-label="Bildirim paneli"
      >
        <Sidebar
          counts={counts}
          reportMode={reportMode}
          onToggleReport={toggleReport}
          onDropAtCenter={dropPinAtCenter}
          query={query}
          onQuery={setQuery}
          filter={filter}
          onFilter={setFilter}
          pins={filteredPins}
          totalCount={pins.length}
          selectedId={selectedId}
          now={now}
          onSelect={focusPin}
          onConfirm={confirmPin}
          onShare={sharePin}
          onDelete={deletePin}
          theme={theme}
          onToggleTheme={toggleTheme}
          sheetExpanded={sheetExpanded}
          onToggleSheet={() => setSheetExpanded((v) => !v)}
        />
      </aside>

      {modalCoords && (
        <ReportModal coords={modalCoords} onClose={closeReport} onSave={saveObstacle} />
      )}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
