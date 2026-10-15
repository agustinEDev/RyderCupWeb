import { useEffect, useState } from 'react';

// Peor que esto, las distancias al green engañan más de lo que ayudan (G5)
export const PRECISION_MAXIMA_M = 30;
const PERMISO_DENEGADO = 1;

/**
 * La posición del jugador por GPS, solo mientras `activo` (mapa de hoyos, BE #532).
 *
 * Nunca se pide sola: la activa el jugador tocando «Activar distancias», y se
 * deja de seguir al salir de la anotación (batería).
 *
 * @returns {{ estado: 'inactivo'|'buscando'|'listo'|'denegado'|'no-disponible',
 *             posicion: {lat:number, lon:number}|null }}
 */
export function usePosicionGps({ activo }) {
  const geolocation = globalThis.navigator?.geolocation;
  const [lectura, setLectura] = useState({ estado: 'buscando', posicion: null });

  useEffect(() => {
    if (!activo || !geolocation) return undefined;
    const id = geolocation.watchPosition(
      ({ coords }) => {
        setLectura(
          coords.accuracy <= PRECISION_MAXIMA_M
            ? { estado: 'listo', posicion: { lat: coords.latitude, lon: coords.longitude } }
            : { estado: 'buscando', posicion: null }
        );
      },
      (error) => {
        if (error?.code === PERMISO_DENEGADO) {
          // Sin insistir: el jugador lo cambia en su navegador si quiere
          geolocation.clearWatch(id);
          setLectura({ estado: 'denegado', posicion: null });
        }
        // Sin señal o tiempo agotado: se sigue buscando
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => {
      geolocation.clearWatch(id);
      // Al volver a activarse, nada de la posición de antes
      setLectura({ estado: 'buscando', posicion: null });
    };
  }, [activo, geolocation]);

  if (!activo) return { estado: 'inactivo', posicion: null };
  if (!geolocation) return { estado: 'no-disponible', posicion: null };
  return lectura;
}
