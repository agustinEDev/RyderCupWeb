import { useEffect, useMemo, useState } from 'react';
import { getGolfCourseUseCase } from '../composition';
import { esPosicionValida } from '../domain/services/geometriaDelHoyo';

/**
 * Dónde abrir el mapa de un hoyo sin mapa mientras el GPS no da posición (S3):
 * en el campo, si se conoce su ubicación. No se guarda ninguna posición del
 * jugador en el móvil: es un dato suyo, y en claro no se deja.
 *
 * La del campo sí (es pública): la última que se supo se da al momento, para
 * tenerla sin cobertura, y sirve también para saber si el jugador está lejos.
 */
const clave = (golfCourseId) => `ubicacionDelCampo:v1:${golfCourseId}`;

const guardada = (golfCourseId) => {
  try {
    const posicion = JSON.parse(globalThis.localStorage.getItem(clave(golfCourseId)));
    return esPosicionValida(posicion) ? posicion : null;
  } catch {
    return null;
  }
};

const guardar = (golfCourseId, posicion) => {
  try {
    globalThis.localStorage.setItem(clave(golfCourseId), JSON.stringify(posicion));
  } catch {
    // Sin sitio: se pedirá la próxima vez
  }
};

export function useCentroSinMapa({ golfCourseId, activo }) {
  const [delCampo, setDelCampo] = useState({ de: null, posicion: null });

  useEffect(() => {
    if (!activo || !golfCourseId) return undefined;
    let vigente = true;
    getGolfCourseUseCase
      .execute(golfCourseId)
      .then((campo) => {
        const posicion = { lat: campo?.location?.latitude, lon: campo?.location?.longitude };
        if (!esPosicionValida(posicion)) return;
        guardar(golfCourseId, posicion);
        if (vigente) setDelCampo({ de: golfCourseId, posicion });
      })
      .catch(() => {
        // Sin red: se espera al GPS
      });
    return () => {
      vigente = false;
    };
  }, [activo, golfCourseId]);

  const copia = useMemo(() => (activo && golfCourseId ? guardada(golfCourseId) : null), [activo, golfCourseId]);
  return delCampo.de === golfCourseId ? delCampo.posicion : copia;
}
