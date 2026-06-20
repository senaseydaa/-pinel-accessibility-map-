import { Accessibility, ArrowUpDown, Construction } from 'lucide-react';

// Üç erişilebilirlik engeli kategorisi. Renk yalnızca grafik öğelerde (ikon,
// pin, sol çizgi) kullanılır; metinler her zaman tema-mürekkebi rengindedir.
export const OBSTACLE_TYPES = {
  rampa: {
    key: 'rampa',
    label: 'Önü Kapalı Rampa',
    short: 'Rampa',
    color: '#EA580C',
    Icon: Accessibility,
    desc: 'Kaldırım rampasının önü kapatılmış ya da rampa kullanılamıyor.',
  },
  asansor: {
    key: 'asansor',
    label: 'Bozuk Asansör',
    short: 'Asansör',
    color: '#2563EB',
    Icon: ArrowUpDown,
    desc: 'Metro, üst geçit veya bina asansörü çalışmıyor.',
  },
  calisma: {
    key: 'calisma',
    label: 'Sokak Çalışması',
    short: 'Çalışma',
    color: '#CA8A04',
    Icon: Construction,
    desc: 'Yol veya kaldırım çalışması geçişi kapatıyor.',
  },
};

export const OBSTACLE_LIST = Object.values(OBSTACLE_TYPES);
export const getType = (key) => OBSTACLE_TYPES[key] || OBSTACLE_TYPES.rampa;
