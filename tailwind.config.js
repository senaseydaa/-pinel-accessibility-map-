/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tema-duyarlı yüzeyler (CSS değişkenlerinden — açık/koyu otomatik)
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        // Marka — Boğaz teali (klişe indigo değil)
        brand: { DEFAULT: '#0F766E', hover: '#0B5C56' },
        // Kategori işlevsel renkleri (yalnızca grafik öğelerde kullanılır)
        ramp: { DEFAULT: '#EA580C', strong: '#9A3412' },
        elevator: { DEFAULT: '#2563EB', strong: '#1E40AF' },
        work: { DEFAULT: '#CA8A04', strong: '#854D0E' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Tek katmanlı, nötr (renkli glow değil)
        card: '0 1px 2px rgba(20,24,28,0.06)',
        pop: '0 6px 24px rgba(20,24,28,0.14)',
        sheet: '0 -10px 30px rgba(20,24,28,0.16)',
      },
    },
  },
  plugins: [],
}
