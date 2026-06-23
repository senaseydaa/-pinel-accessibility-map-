import { useEffect, useState } from 'react';

// Durumu localStorage'da kalıcı tutar (backend değil — yenilemede korunur).
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      /* bozuk veri — varsayılana düş */
    }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* kota dolu / gizli mod — sessizce geç */
    }
  }, [key, value]);

  return [value, setValue];
}
