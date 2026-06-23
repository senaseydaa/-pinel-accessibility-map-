import { useCallback, useState } from 'react';

// "Konumumu bul" — tarayıcı konum servisini sarmalar, durum + hata döndürür.
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', coords: null, error: null });

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      const error = 'Cihaz konum servisini desteklemiyor.';
      setState({ status: 'error', coords: null, error });
      return Promise.reject(new Error(error));
    }
    setState((s) => ({ ...s, status: 'loading', error: null }));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setState({ status: 'success', coords, error: null });
          resolve(coords);
        },
        (err) => {
          const error =
            err.code === 1
              ? 'Konum izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin.'
              : 'Konum alınamadı. Lütfen tekrar deneyin.';
          setState({ status: 'error', coords: null, error });
          reject(new Error(error));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }, []);

  return { ...state, locate };
}
