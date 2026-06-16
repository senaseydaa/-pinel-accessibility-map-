import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  AlertTriangle, 
  X, 
  Trash2, 
  Navigation, 
  Sun, 
  Moon, 
  CheckCircle,
  Accessibility,
  Info,
  Clock,
  ArrowUpDown,
  Wrench
} from 'lucide-react';
import './App.css';

// 4 Custom Obstacle Types mapping with styling metadata (Emojis completely replaced with Lucide/SVG components)
const OBSTACLE_TYPES = {
  1: {
    label: 'Önü Kapalı Rampa',
    icon: <Accessibility size={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
    color: '#EA580C',
    desc: 'Kaldırım rampasının önüne araç park edilmiş veya eşya konulmuş.',
  },
  2: {
    label: 'Dik Rampa',
    icon: <Accessibility size={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
    color: '#EA580C',
    desc: 'Tekerlekli sandalye kullanımına uygun olmayan aşırı dik eğimli rampa.',
  },
  3: {
    label: 'Bozuk Asansör',
    icon: <ArrowUpDown size={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
    color: '#3B82F6',
    desc: 'Üst geçit, metro veya binalardaki engelli asansörünün çalışmaması.',
  },
  4: {
    label: 'Sokak Çalışması',
    icon: <Wrench size={16} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
    color: '#10B981',
    desc: 'Yol yapımı, kaldırım yenileme veya kazı çalışmaları sebebiyle geçişin kapanması.',
  }
};

// Üsküdar Meydanı pilot region coordinates (locked between Marmaray exit & ferry docks)
const MEYDAN_COORDS = [41.0268, 29.0152];

// Custom category-specific markers using DivIcon with clean vector SVG geometries (No emojis in text tags)
const getCategoryIcon = (type) => {
  if (type === 'Bozuk Asansör') {
    return L.divIcon({
      className: 'custom-elevator-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pulse blue-pulse"></div>
          <div class="marker-pin">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#3B82F6"/>
              <circle cx="12" cy="9" r="4.5" fill="white"/>
              <rect x="10.2" y="7.2" width="3.6" height="3.6" rx="0.5" fill="none" stroke="#3B82F6" stroke-width="0.8"/>
              <line x1="12" y1="7.2" x2="12" y2="10.8" stroke="#3B82F6" stroke-width="0.6"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  } else if (type === 'Önü Kapalı Rampa' || type === 'Dik Rampa') {
    return L.divIcon({
      className: 'custom-ramp-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pulse orange-red-pulse"></div>
          <div class="marker-pin">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EA580C"/>
              <circle cx="12" cy="9" r="4.5" fill="white"/>
              <circle cx="12" cy="7.2" r="0.6" fill="#EA580C"/>
              <path d="M12.5 8H11.7l-.4 1.2M11.7 8.7C12.1 8.7 12.5 9.1 12.5 9.5C12.5 9.9 12.1 10.3 11.7 10.3" stroke="#EA580C" stroke-width="0.7" stroke-linecap="round" fill="none"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  } else {
    // Sokak Çalışması (Striped hazard pattern)
    return L.divIcon({
      className: 'custom-work-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pulse work-pulse"></div>
          <div class="marker-pin">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="stripes-pattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#10B981" stroke-width="3" />
                  <line x1="3" y1="0" x2="3" y2="6" stroke="#F59E0B" stroke-width="3" />
                </pattern>
              </defs>
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="url(#stripes-pattern)"/>
              <circle cx="12" cy="9" r="4.5" fill="white" stroke="#1F2937" stroke-width="0.5"/>
              <path d="M12 6.8L13.8 10.2H10.2L12 6.8Z" fill="#1F2937"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }
};

// A component that handles map clicks and triggers the reporting modal
function MapClickHandler({ active, onMapClick, onInactiveClick }) {
  useMapEvents({
    click(e) {
      if (active) {
        onMapClick(e.latlng);
      } else {
        onInactiveClick();
      }
    },
  });
  return null;
}

// A helper component to handle programmatic map flying (centering and zooming)
function MapController({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coords, zoom, map]);
  return null;
}

function App() {
  // --- States ---
  const [pins, setPins] = useState(() => {
    const saved = localStorage.getItem('engelsiz_harita_pins');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Local storage pins parse error:", e);
      }
    }
    // Default 3 simulated mock pins loaded precisely at Uskudar Square center landmarks
    return [
      {
        id: 'marmaray-elevator',
        lat: 41.0266,
        lng: 29.0152,
        type: 'Bozuk Asansör',
        notes: 'Marmaray ana çıkışındaki engelli asansörü arıza nedeniyle geçici olarak servis dışı.',
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'docks-ramp',
        lat: 41.0271,
        lng: 29.0147,
        type: 'Önü Kapalı Rampa',
        notes: 'Vapur iskelesi karşısındaki kaldırım rampasının önüne yoğun kurye motoru park edilmiş.',
        date: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'mosque-construction',
        lat: 41.0259,
        lng: 29.0162,
        type: 'Sokak Çalışması',
        notes: 'Sokak iyileştirme ve altyapı çalışması nedeniyle kaldırım geçişi tekerlekli sandalyeye kapalı.',
        date: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    ];
  });

  const [isReportMode, setIsReportMode] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [tempCoords, setTempCoords] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [filterType, setFilterType] = useState('All');
  
  // Form states
  const [selectedObstacleType, setSelectedObstacleType] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Map Controller focus state (hardlocked on Uskudar Square coordinates)
  const [mapFocus, setMapFocus] = useState({ coords: MEYDAN_COORDS, zoom: 18, trigger: 0 });
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Save pins to localStorage
  useEffect(() => {
    localStorage.setItem('engelsiz_harita_pins', JSON.stringify(pins));
  }, [pins]);

  // Apply dark mode theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Actions ---
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleMapClick = (latlng) => {
    setTempCoords({ lat: latlng.lat, lng: latlng.lng });
    // Reset form values
    setSelectedObstacleType(1);
    setNotes('');
  };

  const handleInactiveClick = () => {
    showToast('Engel bildirmek için lütfen yukarıdan "Engel Bildir" modunu aktif edin.', 'error');
  };

  const handleSaveObstacle = () => {
    if (!tempCoords) return;

    const newPin = {
      id: `pin-${Date.now()}`,
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      type: OBSTACLE_TYPES[selectedObstacleType].label,
      notes: notes.trim(),
      date: new Date().toISOString()
    };

    setPins(prev => [newPin, ...prev]);
    setTempCoords(null);
    setIsReportMode(false); // Auto toggle off after reporting
    showToast('Engel haritaya başarıyla kaydedildi!');
  };

  const handleDeletePin = (id) => {
    setPins(prev => prev.filter(pin => pin.id !== id));
    showToast('Bildirim başarıyla silindi.');
  };

  const handleFocusMeydan = () => {
    setMapFocus({
      coords: MEYDAN_COORDS,
      zoom: 18,
      trigger: Math.random() // Force trigger update
    });
    showToast("Üsküdar Meydanı'na odaklanıldı.");
  };

  const handleFocusPin = (pin) => {
    setMapFocus({
      coords: [pin.lat, pin.lng],
      zoom: 19,
      trigger: Math.random()
    });
    setSelectedPin(pin);
  };

  const getObstacleTypeKey = (label) => {
    return Object.keys(OBSTACLE_TYPES).find(key => OBSTACLE_TYPES[key].label === label);
  };

  // --- Filter and Stats Calculations ---
  const filteredPins = pins.filter(pin => {
    if (filterType === 'All') return true;
    if (filterType === 'Ramp') return pin.type === 'Önü Kapalı Rampa' || pin.type === 'Dik Rampa';
    if (filterType === 'Elevator') return pin.type === 'Bozuk Asansör';
    if (filterType === 'Work') return pin.type === 'Sokak Çalışması';
    return true;
  });

  const getStats = () => {
    const stats = { total: pins.length, ramp: 0, elevator: 0, work: 0 };
    pins.forEach(pin => {
      if (pin.type === 'Önü Kapalı Rampa' || pin.type === 'Dik Rampa') stats.ramp++;
      else if (pin.type === 'Bozuk Asansör') stats.elevator++;
      else if (pin.type === 'Sokak Çalışması') stats.work++;
    });
    return stats;
  };

  const stats = getStats();

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`app-container ${isReportMode ? 'reporting-cursor' : ''}`}>
      
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Panel */}
      <aside className="sidebar">
        
        {/* Sidebar Header (Emojis completely removed) */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon-wrapper">
              <Accessibility size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Üsküdar Meydanı / Merkez</h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.1rem' }}>
                Canlı Erişilebilirlik & Mobilite Katmanı
              </p>
            </div>
          </div>
          <p className="sidebar-desc">
            Üsküdar Meydanı ve çevresindeki erişilebilirlik engellerini bildirin, engelli bireyler için engelsiz ve konforlu bir ulaşım ağına destek olun.
          </p>
        </div>

        {/* Toggle Mode Section */}
        <div className="mode-toggle-section">
          <div className={`toggle-card ${isReportMode ? 'active' : ''}`}>
            <div className="toggle-info">
              <span className="toggle-title">
                <AlertTriangle size={16} className={isReportMode ? 'pulse-dot' : ''} style={{ color: isReportMode ? 'var(--danger)' : 'var(--text-muted)' }} />
                Engel Bildir Modu
              </span>
              <span className="toggle-subtitle">
                {isReportMode ? 'Haritaya tıklayarak engel ekle' : 'Haritada gezinmek için açık'}
              </span>
            </div>
            <label className="switch">
              <input 
                id="report-mode-toggle"
                type="checkbox" 
                checked={isReportMode} 
                onChange={(e) => {
                  setIsReportMode(e.target.checked);
                  if (e.target.checked) {
                    showToast('Engel bildirim modu aktif. Bildirmek istediğiniz yere tıklayın.', 'success');
                  } else {
                    showToast('Harita gezinme moduna geçildi.');
                  }
                }}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Sidebar Main Content */}
        <div className="sidebar-content">
          
          {/* Quick Focus Button */}
          <button 
            id="btn-focus-meydan"
            className="action-btn"
            onClick={handleFocusMeydan}
          >
            <Navigation size={16} />
            Meydana Odaklan (Merkez)
          </button>

          {/* Statistics Card */}
          <div className="stats-container">
            <span className="stats-title">Bildirim İstatistikleri</span>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Toplam Engel</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '3px solid #EA580C' }}>
                <span className="stat-value">{stats.ramp}</span>
                <span className="stat-label">Rampa Engeli</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '3px solid #3B82F6' }}>
                <span className="stat-value">{stats.elevator}</span>
                <span className="stat-label">Bozuk Asansör</span>
              </div>
              <div className="stat-item" style={{ borderLeft: '3px solid #10B981' }}>
                <span className="stat-value">{stats.work}</span>
                <span className="stat-label">Yol Çalışması</span>
              </div>
            </div>
          </div>

          {/* Obstacle List with Tabs */}
          <div className="obstacle-section">
            <div className="section-header-row">
              <span className="stats-title">Bildirilen Engeller</span>
              <span className="obstacle-count-badge">{filteredPins.length} Adet</span>
            </div>
            
            {/* Filter Tabs - No wrapping/truncation overflow layout, Emojis completely removed */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', flexWrap: 'nowrap', width: '100%' }}>
              {['All', 'Ramp', 'Elevator', 'Work'].map((t) => (
                <button
                  key={t}
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    backgroundColor: filterType === t ? 'var(--primary)' : 'var(--bg-card)',
                    color: filterType === t ? '#ffffff' : 'var(--text-muted)',
                    borderColor: filterType === t ? 'var(--primary)' : 'var(--border-color)',
                  }}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'All' && 'Tümü'}
                  {t === 'Ramp' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Accessibility size={12} />
                      Rampa
                    </span>
                  )}
                  {t === 'Elevator' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ArrowUpDown size={12} />
                      Asansör
                    </span>
                  )}
                  {t === 'Work' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wrench size={12} />
                      Çalışma
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="obstacle-list">
              {filteredPins.length === 0 ? (
                <div className="no-obstacles">
                  Seçilen filtreye uygun engel bulunamadı.
                </div>
              ) : (
                filteredPins.map((pin) => {
                  const typeKey = getObstacleTypeKey(pin.type);
                  const typeMeta = OBSTACLE_TYPES[typeKey] || { icon: <AlertTriangle size={16} />, color: '#EF4444' };
                  
                  return (
                    <div 
                      key={pin.id} 
                      className="obstacle-card"
                      style={{ '--danger': typeMeta.color }}
                      onClick={() => handleFocusPin(pin)}
                    >
                      <div className="obstacle-card-header">
                        <span className="obstacle-card-title">
                          <span style={{ color: typeMeta.color, display: 'flex', alignItems: 'center' }}>
                            {typeMeta.icon}
                          </span>
                          <span style={{ marginLeft: '0.35rem' }}>{pin.type}</span>
                        </span>
                        <span className="obstacle-card-date">{formatDate(pin.date)}</span>
                      </div>
                      
                      {pin.notes && (
                        <p className="obstacle-card-desc">{pin.notes}</p>
                      )}
                      
                      {/* Live indicator on Sol Panel List Items (No emojis) */}
                      <div className="live-indicator-wrapper">
                        <span className="live-dot"></span>
                        <Clock size={12} style={{ flexShrink: 0 }} />
                        <span>Canlı Veri (Geçerlilik: 1 sa 42 dk)</span>
                      </div>
                      
                      <div className="obstacle-card-actions">
                        <button 
                          className="btn-locate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusPin(pin);
                          }}
                        >
                          <Navigation size={10} />
                          Haritada Göster
                        </button>
                        <button 
                          className="btn-delete"
                          title="Sil"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePin(pin.id);
                            if (selectedPin?.id === pin.id) setSelectedPin(null);
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <footer className="sidebar-footer">
          <span>Engelsiz Ulaşım © 2026</span>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? (
              <>
                <Moon size={12} />
                <span>Koyu Tema</span>
              </>
            ) : (
              <>
                <Sun size={12} />
                <span>Açık Tema</span>
              </>
            )}
          </button>
        </footer>

      </aside>

      {/* Map Section */}
      <main className={`map-wrapper ${theme === 'dark' ? 'dark-mode-map' : ''}`}>
        
        {/* Floating Top Banner Alert */}
        {isReportMode ? (
          <div className="map-banner">
            <span className="pulse-dot"></span>
            <span>Engel Bildir Modu Aktif. Lütfen harita üzerinde engelin bulunduğu noktaya tıklayın.</span>
          </div>
        ) : (
          <div className="map-banner info-banner">
            <Info size={16} />
            <span>Haritada engel bildirmek için soldaki rampa/engel modunu açın.</span>
          </div>
        )}

        <MapContainer 
          center={MEYDAN_COORDS} 
          zoom={18} 
          className="map-container"
          zoomControl={true}
        >
          {/* Tile Layer (OSM Light Style) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Programmatic map focus handler */}
          <MapController coords={mapFocus.coords} zoom={mapFocus.zoom} key={mapFocus.trigger} />

          {/* Capture map clicks */}
          <MapClickHandler 
            active={isReportMode} 
            onMapClick={handleMapClick} 
            onInactiveClick={handleInactiveClick}
          />

          {/* Fixed Uskudar Square Reference Point */}
          <Marker 
            position={MEYDAN_COORDS}
            icon={L.divIcon({
              className: 'campus-pin',
              html: `
                <div style="background-color: var(--primary); border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; box-shadow: var(--shadow-lg); display: flex; align-items: center; justify-content: center;">
                  <div style="background-color: white; width: 8px; height: 8px; border-radius: 50%;"></div>
                </div>
              `,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            })}
          >
            <Popup>
              <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--primary)' }}>Üsküdar Meydanı</h4>
                <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Pilot Bölge Merkezi</p>
              </div>
            </Popup>
          </Marker>

          {/* Active Obstacle Markers (Color Coded Categories using custom CSS/HTML/SVG - No emojis) */}
          {pins.map((pin) => (
            <Marker 
              key={pin.id} 
              position={[pin.lat, pin.lng]} 
              icon={getCategoryIcon(pin.type)}
              eventHandlers={{
                click: () => {
                  setSelectedPin(pin);
                }
              }}
            />
          ))}

          {/* Shared Active Marker Popup */}
          {selectedPin && (
            <Popup 
              position={[selectedPin.lat, selectedPin.lng]} 
              onClose={() => setSelectedPin(null)}
            >
              <div>
                <h3 className="popup-header" style={{ color: OBSTACLE_TYPES[getObstacleTypeKey(selectedPin.type)]?.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {OBSTACLE_TYPES[getObstacleTypeKey(selectedPin.type)]?.icon}
                  <span>{selectedPin.type}</span>
                </h3>
                <p className="popup-notes">{selectedPin.notes || 'Detay açıklaması eklenmedi.'}</p>
                
                {/* Live indicator inside pop-up (No emojis) */}
                <div className="live-indicator-wrapper">
                  <span className="live-dot"></span>
                  <Clock size={12} style={{ flexShrink: 0 }} />
                  <span>Canlı Veri (Geçerlilik: 1 sa 42 dk)</span>
                </div>

                <div className="popup-footer">
                  <span>{formatDate(selectedPin.date)}</span>
                  <button 
                    className="popup-delete-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePin(selectedPin.id);
                      setSelectedPin(null);
                    }}
                  >
                    <Trash2 size={12} />
                    Bildirimi Sil
                  </button>
                </div>
              </div>
            </Popup>
          )}

        </MapContainer>

      </main>

      {/* New Obstacle Modal Form */}
      {tempCoords && (
        <div className="modal-overlay" onClick={() => setTempCoords(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                Yeni Engel Bildirimi
              </h2>
              <button className="modal-close-btn" onClick={() => setTempCoords(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <div>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Koordinatlar</span>
                <div className="coordinate-badge">
                  Lat: {tempCoords.lat.toFixed(6)}, Lng: {tempCoords.lng.toFixed(6)}
                </div>
              </div>

              {/* Selection cards for 4 obstacle types */}
              <div className="form-group">
                <label className="form-label">Engel Türü Seçin</label>
                <div className="options-grid">
                  {Object.keys(OBSTACLE_TYPES).map((key) => {
                    const type = OBSTACLE_TYPES[key];
                    const isSelected = selectedObstacleType === parseInt(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`option-button ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedObstacleType(parseInt(key))}
                      >
                        <span className="option-icon" style={{ color: isSelected ? 'white' : type.color, display: 'flex', alignItems: 'center' }}>
                          {type.icon}
                        </span>
                        <div className="option-text-wrapper">
                          <span className="option-label">{type.label}</span>
                          <span className="option-desc">{type.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Area for Notes */}
              <div className="form-group">
                <label htmlFor="notes-input" className="form-label">Açıklama & Detay (İsteğe Bağlı)</label>
                <textarea
                  id="notes-input"
                  className="notes-textarea"
                  placeholder="Engelin konumu, durumu veya ek detaylar (ör. 'Kurye motorlarının plakaları...')"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                id="btn-cancel-modal"
                className="btn-secondary" 
                onClick={() => setTempCoords(null)}
              >
                Vazgeç
              </button>
              <button 
                id="btn-save-obstacle"
                className="btn-danger" 
                onClick={handleSaveObstacle}
              >
                Engeli Bildir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
