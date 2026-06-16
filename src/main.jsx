import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as Lucide from 'lucide-react';
import L from 'leaflet';

// Haritayı hareketlerde canlı tutan asenkron sabitleyici
function MapFixer({ activePin }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.invalidateSize();
      const t1 = setTimeout(() => { map.invalidateSize(); }, 200);
      const t2 = setTimeout(() => {
        map.invalidateSize();
        map.panBy([0, 1], { animate: false });
        map.panBy([0, -1], { animate: false });
      }, 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [map, activePin]);
  return null;
}

// Haritaya tıklamayı yakalayan ve koordinatları modal'a paslayan bileşen
function MapClickHandler({ reportMode, onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (reportMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// ÇOK DAHA DİKKAT ÇEKİCİ NEON IŞIKLI PULSE MARGER TASARIMI
const createCustomRedMarker = (type) => {
  return L.divIcon({
    className: 'custom-pulsing-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; background: rgba(239, 68, 68, 0.6); border-radius: 50%; box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.5); animation: pulse 1.2s infinite;"></div>
        <div style="position: relative; width: 32px; height: 32px; background: #EF4444; border: 2.5px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

export default function App() {
  const [pins, setPins] = useState([
    { id: 1, type: 'asansör', lat: 41.0264, lng: 29.0148, description: 'Üsküdar Marmaray çıkışındaki engelli asansörü arıza sebebiyle servis dışı.', time: '16 Haz 10:07', expiresIn: 240 },
    { id: 2, type: 'rampa', lat: 41.0272, lng: 29.0156, description: 'Vapur İskelesi karşısındaki kaldırım rampasının önüne motosikletler park edilmiş.', time: '16 Haz 07:07', expiresIn: 240 },
    { id: 3, type: 'çalışma', lat: 41.0261, lng: 29.0162, description: 'Mihrimah Sultan Camii arkasındaki sokak çalışması tekerlekli sandalye geçişini engelliyor.', time: '15 Haz 12:07', expiresIn: 240 },
    { id: 4, type: 'asansör', lat: 41.0268, lng: 29.0152, description: 'Detay eklenmedi.', time: '16 Haz 12:15', expiresIn: 240 }
  ]);
  
  const [selectedPin, setSelectedPin] = useState(null);
  const [filter, setFilter] = useState('tümü');
  const [reportMode, setReportMode] = useState(false);
  
  // MODAL VE FORM STATE YAPILARI
  const [showModal, setShowModal] = useState(false);
  const [tempCoords, setTempCoords] = useState(null);
  const [formType, setFormType] = useState('rampa');
  const [formDesc, setFormDesc] = useState('');
  
  const mapInstanceRef = useRef(null);
  const filteredPins = pins.filter(p => filter === 'tümü' || p.type === filter);

  // Haritaya tıklandığında modalı tetikleyen fonksiyon
  const handleMapClick = (lat, lng) => {
    setTempCoords({ lat, lng });
    setShowModal(true);
  };

  // Form onaylandığında yeni pini dataya gömen fonksiyon
  const handleSaveObstacle = () => {
    if (!tempCoords) return;
    const newPin = {
      id: Date.now(),
      type: formType,
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      description: formDesc.trim() || 'Detay belirtilmedi.',
      time: '16 Haz 12:46',
      expiresIn: 240
    };
    setPins([newPin, ...pins]);
    setSelectedPin(newPin);
    setShowModal(false);
    setReportMode(false);
    setFormDesc('');
  };

  const handleCardClick = (pin) => {
    setSelectedPin(pin);
    if (mapInstanceRef.current) {
      // Binaları net görebilmek için zoom seviyesini 19'a çektik!
      mapInstanceRef.current.flyTo([pin.lat, pin.lng], 19, { animate: true, duration: 1 });
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 200);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.panBy([0, 1], { animate: false });
          mapInstanceRef.current.panBy([0, -1], { animate: false });
        }
      }, 1100);
    }
  };

  // Zaman aşımı silme döngüsü
  useEffect(() => {
    const interval = setInterval(() => {
      setPins(prevPins => {
        return prevPins.map(pin => {
          if (pin.expiresIn <= 1) {
            if (selectedPin?.id === pin.id) setSelectedPin(null);
            return null; // Süresi biteni haritadan sil
          }
          return { ...pin, expiresIn: pin.expiresIn - 1 };
        }).filter(Boolean);
      });
    }, 1000); // Sunumda akışı görebilmek için her saniye 1 dakika eksiltir
    return () => clearInterval(interval);
  }, [selectedPin]);

  const handleExtendLife = (e, id) => {
    e.stopPropagation(); // Harita uçuşunu tetiklemesin
    setPins(prevPins => prevPins.map(pin => {
      if (pin.id === id) {
        return { ...pin, expiresIn: 240 }; // Süreyi tekrar 4 saate kilitler
      }
      return pin;
    }));
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', margin: 0, padding: 0, position: 'relative' }}>
      
      {/* DIŞA DOĞRU PARLAYAN RADAR EFEKTİ İÇİN KÜÇÜK BİR CSS ENJEKSİYONU */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* MODAL - ENGELLİ BİLDİRİM FORMU (PREMIUM AÇILIR PANEL) */}
      {showModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', width: '400px', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Yeni Engel Detayları</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Lucide.X size={18} /></button>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>ENGEL KATEGORİSİ</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#1e293b', backgroundColor: '#ffffff', outline: 'none' }}>
                <option value="rampa">Önü Kapalı Rampa</option>
                <option value="asansör">Bozuk Asansör</option>
                <option value="çalışma">Sokak Çalışması</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>JÜRİ ÖZEL / ENGEL AÇIKLAMASI</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Örn: Kaldırım rampasının önüne gri renkli bir araç park edilmiş..." rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#1e293b', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Vazgeç</button>
              <button onClick={handleSaveObstacle} style={{ flex: 2, padding: '10px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Engeli Haritaya İşle</button>
            </div>
          </div>
        </div>
      )}

      {/* SOL PANEL (SIDEBAR) */}
      <div style={{ width: '380px', height: '100vh', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 1000, overflow: 'hidden', boxShadow: '4px 0 24px rgba(0,0,0,0.05)' }}>
        
        {/* Üst Başlık */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#eef2ff', color: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Lucide.Accessibility size={20} />
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.1em' }}>PINel — CANLI ERİŞİM KATMANI</div>
              <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>Üsküdar Meydanı / Merkez</h1>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            Üsküdar çevresindeki erişilebilirlik engellerini bildirin, herkes için erişilebilir şehirler inşa edin.
          </p>
        </div>

        {/* Engel Bildir Aktivasyon Butonu */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          <button 
            onClick={() => setReportMode(!reportMode)}
            style={{ width: '100%', padding: '10px', backgroundColor: reportMode ? '#ef4444' : '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', justifyContent: 'center' }}
          >
            <Lucide.TriangleAlert size={14} />
            {reportMode ? 'Haritada İstediğin Noktaya Tıkla' : 'Meydana Engel Bildir'}
          </button>
        </div>

        {/* İSTATİSTİK KUTULARI */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '10px' }}>BİLDİRİM İSTATİSTİKLERİ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{pins.length}</span>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', marginTop: '6px' }}>TOPLAM</span>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{pins.filter(p=>p.type==='rampa').length}</span>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', marginTop: '6px' }}>RAMPA</span>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{pins.filter(p=>p.type==='asansör').length}</span>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', marginTop: '6px' }}>ASANSÖR</span>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{pins.filter(p=>p.type==='çaimza' || p.type==='çalışma').length}</span>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', marginTop: '6px' }}>ÇALIŞMA</span>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
          {['tümü', 'rampa', 'asansör', 'çalışma'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid', borderColor: filter === cat ? '#4f46e5' : '#cbd5e1', backgroundColor: filter === cat ? '#eef2ff' : '#ffffff', color: filter === cat ? '#4f46e5' : '#64748b', cursor: 'pointer' }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* ENGEL KARTLARI LİSTESİ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredPins.map((pin) => (
            <div 
              key={pin.id}
              onClick={() => handleCardClick(pin)}
              style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid', borderColor: selectedPin?.id === pin.id ? '#4f46e5' : '#e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pin.type === 'asansör' ? '#3b82f6' : pin.type === 'çalışma' ? '#f59e0b' : '#ef4444' }}></span>
                  {pin.type === 'asansör' ? 'Bozuk Asansör' : pin.type === 'çalışma' ? 'Sokak Çalışması' : 'Önü Kapalı Rampa'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>{pin.time}</span>
              </div>
              
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {pin.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                  <Lucide.Clock size={12} />
                  <span>Canlı Veri (Kalan Süre: {Math.floor(pin.expiresIn / 60)} sa {pin.expiresIn % 60} dk)</span>
                </div>
                <button
                  onClick={(e) => handleExtendLife(e, pin.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#312e81'; e.currentTarget.style.backgroundColor = '#eef2ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Lucide.CheckCircle size={12} />
                  <span>Engeli Onayla</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SAĞ TARAF - DESTEKLENEN MAX ZOOM SEVİYESİ ARTIRILMIŞ HARİTA ALANI */}
      <div style={{ flex: 1, height: '100vh', position: 'relative', backgroundColor: '#cbd5e1' }}>
        <MapContainer 
          center={[41.0268, 29.0152]} 
          zoom={19} 
          maxZoom={19}
          style={{ height: '100%', width: '100%', display: 'block' }}
          whenReady={(mapInstance) => { mapInstanceRef.current = mapInstance.target; }}
        >
          <MapFixer activePin={selectedPin} />
          <MapClickHandler reportMode={reportMode} onMapClick={handleMapClick} />
          
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
            keepBuffer={12}
            maxZoom={19}
            updateWhenIdle={false}
          />

          {filteredPins.map((pin) => (
            <Marker 
              key={pin.id} 
              position={[pin.lat, pin.lng]}
              icon={createCustomRedMarker(pin.type)}
            >
              <Popup>
                <div style={{ padding: '4px', maxWidth: '200px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', marginBottom: '4px' }}>
                    {pin.type === 'asansör' ? 'Bozuk Asansör' : pin.type === 'çalışma' ? 'Sokak Çalışması' : 'Önü Kapalı Rampa'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>{pin.description}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
