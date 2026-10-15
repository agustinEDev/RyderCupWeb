import { useEffect, useState } from 'react';
import { esPosicionValida } from '../domain/services/geometriaDelHoyo';

// Peor que esto, las distancias al green engañan más de lo que ayudan (G1)
export const PRECISION_MAXIMA_M = 30;
const PERMISO_DENEGADO = 1;

/**
 * La posición del jugador por GPS, solo mientras `activo` (mapa de hoyos, BE #532).
 *
 * La pide el mapa del hoyo al abrirse y la deja de seguir al cerrarse (batería).
 *
 * @returns {{ estado: 'inactivo'|'buscando'|'listo'|'denegado'|'no-disponible',
 *             posicion: {lat:number, lon:number}|null }}
 */
export function usePosicionGps({ activo }) {
  const geolocation = globalThis.navigator?.geolocation;
  const [lectura, setLectura] = useState({ estado: 'buscando', posicion: null });

  useEffect(() => {
    if (!activo || !geolocation) return undefined;
    // `let` antes de pedirla: hay navegadores que avisan del permiso denegado
    // dentro de la propia llamada, cuando aún no ha devuelto su id
    let id = null;
    let denegado = false;
    id = geolocation.watchPosition(
      ({ coords }) => {
        const posicion = { lat: coords.latitude, lon: coords.longitude };
        setLectura(
          coords.accuracy <= PRECISION_MAXIMA_M && esPosicionValida(posicion)
            ? { estado: 'listo', posicion }
            : { estado: 'buscando', posicion: null }
        );
      },
      (error) => {
        if (error?.code === PERMISO_DENEGADO) {
          // Sin insistir: el jugador lo cambia en su navegador si quiere
          denegado = true;
          if (id !== null) geolocation.clearWatch(id);
          setLectura({ estado: 'denegado', posicion: null });
        }
        // Sin señal o tiempo agotado: se sigue buscando
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    if (denegado) geolocation.clearWatch(id);
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
