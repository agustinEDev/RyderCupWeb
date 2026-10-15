import { useEffect, useState } from 'react';
import { getGolfCourseUseCase } from '../composition';
import { esPosicionValida } from '../domain/services/geometriaDelHoyo';

/**
 * Dónde abrir el mapa de un hoyo sin mapa mientras el GPS no da posición (S3):
 * en el campo, si se conoce su ubicación. No se guarda ninguna posición del
 * jugador en el móvil: es un dato suyo, y en claro no se deja.
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
        // Sin red: se espera al GPS
      });
    return () => {
      vigente = false;
    };
  }, [activo, golfCourseId]);

  return delCampo.de === golfCourseId ? delCampo.posicion : null;
}
