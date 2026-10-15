import { useEffect, useState } from 'react';
import { getGolfCourseUseCase } from '../composition';
import { esPosicionValida } from '../domain/services/geometriaDelHoyo';

const CLAVE = 'mapaDeHoyos:ultimaPosicion';

const leerUltima = () => {
  try {
    const posicion = JSON.parse(globalThis.localStorage.getItem(CLAVE));
    return esPosicionValida(posicion) ? posicion : null;
  } catch {
    return null;
  }
};

/** Guarda la última posición buena del GPS, para la próxima vez sin señal. */
export const recordarPosicion = (posicion) => {
  try {
    if (esPosicionValida(posicion)) globalThis.localStorage.setItem(CLAVE, JSON.stringify(posicion));
  } catch {
    // Sin almacenamiento: la próxima vez se espera al GPS
  }
};

/**
 * Dónde abrir el mapa de un hoyo sin mapa mientras el GPS no da posición (S3):
 * en el campo si se conoce su ubicación; si no, en la última posición buena.
 */
export function useCentroSinMapa({ golfCourseId, activo }) {
  const [delCampo, setDelCampo] = useState({ de: null, posicion: null });

  useEffect(() => {
    if (!activo || !golfCourseId) return undefined;
    let vigente = true;
    getGolfCourseUseCase
      .execute(golfCourseId)
      .then((campo) => {
        const posicion = { lat: campo?.location?.latitude, lon: campo?.location?.longitude };
        if (vigente && esPosicionValida(posicion)) setDelCampo({ de: golfCourseId, posicion });
      })
      .catch(() => {
        // Sin red: la última posición
      });
    return () => {
      vigente = false;
    };
  }, [activo, golfCourseId]);

  return (delCampo.de === golfCourseId ? delCampo.posicion : null) ?? leerUltima();
}
