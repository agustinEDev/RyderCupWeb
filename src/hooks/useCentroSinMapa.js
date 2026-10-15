import { useEffect, useState } from 'react';
import { getGolfCourseUseCase } from '../composition';
import { esPosicionValida } from '../domain/services/geometriaDelHoyo';
import { leerUltimaPosicion } from '../services/ultimaPosicion';

/**
 * Dónde abrir el mapa de un hoyo sin mapa mientras el GPS no da posición (S3):
 * en el campo si se conoce su ubicación; si no, en la última posición buena.
 * Con su `fuente` ('campo' | 'ultima'): la del campo, que llega después, manda
 * sobre la última, que puede ser de otro campo.
 */
export function useCentroSinMapa({ golfCourseId, activo }) {
  const [delCampo, setDelCampo] = useState({ de: null, posicion: null });
  // Una vez por apertura: el mapa se pinta en cada lectura del GPS
  const [ultima] = useState(leerUltimaPosicion);

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

  const campo = delCampo.de === golfCourseId ? delCampo.posicion : null;
  if (campo) return { ...campo, fuente: 'campo' };
  return ultima ? { ...ultima, fuente: 'ultima' } : null;
}
