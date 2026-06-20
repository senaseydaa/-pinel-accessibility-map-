# PINel — Erişilebilir Yeniden Tasarım (Tasarım Belgesi)

**Tarih:** 2026-06-20
**Bağlam:** TRT Geleceğin İletişimcileri — Dijital Ürün Geliştirme kategorisi.
**Kapsam:** Üsküdar Meydanı pilot bölgesi. Backend yok (sonraki aşamaya bırakıldı).

## Problem

Tekerlekli sandalye ve azalmış hareket kabiliyetine sahip bireyler için şehir içi
ulaşımda en büyük engel, **anlık ve güncel erişilebilirlik bilgisinin olmaması**dır:
önü kapatılmış rampalar, bozuk asansörler, kaldırımı kapatan sokak çalışmaları.
PINel, Üsküdar Meydanı çevresindeki bu engelleri **canlı bir harita katmanında**
toplulukla birlikte bildirip görünür kılar.

## Hedef

Çalışan demoyu, **bitmiş ve gerçekten erişilebilir bir ürüne** dönüştürmek. Bu
kategoride ve bu temada en güçlü mesaj: *erişilebilirlik uygulamasının kendisinin
de erişilebilir olması.*

## Mevcut durumun kısa değerlendirmesi

- Tüm uygulama tek dosyada (`src/main.jsx`), her şey inline stil.
- Erişilebilirlik yok: klavye desteği yok, ARIA yok, anlamsal HTML zayıf.
- Veri kalıcı değil (yenilemede bildirimler sıfırlanır), zaman damgaları sabit kodlu.
- Tailwind kurulu ama kullanılmıyor; demo artıkları var ("jüri özel" metni, `çaimza` typo'su).
- Ölü kod (eski `App.jsx`, kullanılmayan CSS ve şablon görselleri) ayrı bir dalda temizlendi.

## Tasarım

### 1. Kod yapısı
`main.jsx` yalnızca uygulamayı başlatır. Mantık net bileşenlere bölünür:

```
src/
  main.jsx                 → sadece createRoot + <App/>
  App.jsx                  → durum (state) + düzen (layout) orkestrasyonu
  components/
    Sidebar.jsx            → marka, istatistik, filtre/arama, bildirim listesi
    ObstacleCard.jsx       → tek bildirim kartı
    ReportModal.jsx        → yeni engel bildirim formu (erişilebilir diyalog)
    MapView.jsx            → Leaflet haritası, işaretçiler, tıklama/odak yöneticileri
    Toast.jsx              → aria-live duyurulu bildirimler
  data/obstacleTypes.js    → 3 kategori: meta, renk, ikon, açıklama
  hooks/
    useLocalStorage.js     → kalıcı durum
    useGeolocation.js      → "konumumu bul"
```

### 2. Görsel sistem (Tailwind)
- Tailwind aktive edilir (`@tailwind` direktifleri + `tailwind.config.js` tema jetonları).
- Tasarım jetonları: erişilebilir renk paleti (WCAG AA kontrast), tipografi
  (Plus Jakarta Sans), tutarlı boşluk/gölge/radius.
- Açık + koyu tema (`dark:` sınıf stratejisi, tercih localStorage'da saklanır).
- Kategori renkleri anlamı korur ve **her zaman ikon + metinle** birlikte kullanılır
  (renk tek başına anlam taşımaz): Rampa = turuncu, Asansör = mavi, Çalışma = amber.

### 2a. Görsel disiplin — AI-slop yasağı (zorunlu)
Sivil, güvenilir, kasıtlı bir ürün dili hedeflenir. Aşağıdakiler **tamamen yasak**:
- **Gradient yok** (arka plan, metin, buton, marka — hiçbir yerde `linear/radial-gradient`).
- **Glow / neon yok** (renkli `box-shadow` parıltıları, `0 0 Npx rgba()` ışıması).
- **Pulse / radar animasyonu yok** (mevcut neon işaretçi efektleri kaldırılır).
- **Glassmorphism yok** (`backdrop-filter: blur`, yarı saydam buzlu paneller).
- **Klişe varsayılan indigo (#4f46e5) merkezli "AI startup" paleti yok** — bunun
  yerine sivil, ölçülü, yüksek kontrastlı bir palet seçilir.
- Aşırı yuvarlatma, ağır çok katmanlı gölge, "premium/parlayan" jargon yok.

Yerine: düz (flat) yüzeyler, ince hairline kenarlıklar, **tek katmanlı yumuşak ve
nötr** gölge (yalnızca yükseklik/elevation için, renksiz), net tipografik hiyerarşi,
amaca hizmet eden minimum hareket. Harita işaretçileri sade, okunur, kategori-renkli
düz pinler olur (parıltısız).

### 3. Mobil uyum
- Masaüstü: sol panel (sidebar) + harita yan yana.
- Mobil: harita tam ekran; panel alttan açılan bir çekmeceye (bottom sheet) döner.

### 4. Erişilebilirlik (asıl fark yaratan eksen)
- Anlamsal HTML (`<header>`, `<main>`, `<aside>`, `<nav>`) + doğru başlık hiyerarşisi.
- Tüm interaktif öğeler klavyeyle erişilebilir; görünür odak (focus) halkaları.
- **Klavyeyle bildirim ekleme:** haritaya tıklamak tek yol olmasın — "Merkeze pin
  bırak" düğmesiyle fare olmadan da bildirim eklenebilir.
- Modal: gerçek diyalog semantiği (`role="dialog"`, `aria-modal`), odak tuzağı
  (focus trap), Esc ile kapatma, açılışta odak forma, kapanışta tetikleyiciye döner.
- Toast'lar `aria-live="polite"` ile ekran okuyucuya duyurulur.
- `prefers-reduced-motion`: pulse/radar animasyonları kapanır.
- WCAG AA kontrast; ikonlara erişilebilir ad/etiket.

### 5. Veri & doğruluk
- localStorage kalıcılığı (backend değil; yenilemede bildirimler korunur).
- Gerçek `Date` zaman damgaları + "x dk önce" göreli gösterim (tr-TR).
- Demo artıkları temizlenir ("jüri özel" metni, `çaimza` typo'su, sabit kodlu tarihler).

### 6. Ürün dokunuşları
- **Konumumu bul** (geolocation): kullanıcıyı haritada konumlandırır — gerçek
  cihazda yön bulma hissi.
- **Arama**: bildirim açıklamalarında metin araması + mevcut kategori filtreleri.
- **Paylaşma**: bir bildirimi seçili haritaya bağlantı (deep-link / panoya kopyala)
  olarak paylaşma.

## Kapsam dışı (bilinçli)
- Gerçek backend / çok kullanıcılı senkronizasyon (sonraki aşama).
- Üsküdar dışına coğrafi genişleme.
- Gerçek rota bulma motoru (bu turda yok).

## Başarı ölçütü
- Klavye + ekran okuyucu ile bildirim eklenebiliyor.
- Yenilemede veri korunuyor; zaman damgaları gerçek.
- Mobil ve masaüstünde düzgün görünüyor; açık/koyu tema çalışıyor.
- `npm run build` hatasız; temel WCAG AA kontrast sağlanıyor.
