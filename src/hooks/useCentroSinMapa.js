import { useEffect, useMemo, useState } from 'react';
import { getCourseLocationUseCase } from '../composition';

/**
 * Dónde abrir el mapa de un hoyo sin mapa mientras el GPS no da posición (S3):
 * en el campo, si se conoce su ubicación. Sirve también para saber si el
 * jugador está lejos del campo. La última que se supo se da al momento (para
 * tenerla sin cobertura) y la red la refresca. No se guarda ninguna posición
 * del jugador: es un dato suyo, y en claro no se deja.
 */
export function useCentroSinMapa({ golfCourseId, activo }) {
  const [delCampo, setDelCampo] = useState({ de: null, posicion: null });
  const copia = useMemo(
    () => (activo && golfCourseId ? getCourseLocationUseCase.guardada(golfCourseId) : null),
    [activo, golfCourseId],
  );

  useEffect(() => {
    if (!activo || !golfCourseId) return undefined;
    let vigente = true;
    getCourseLocationUseCase
      .execute(golfCourseId)
      .then((posicion) => {
        if (vigente && posicion) setDelCampo({ de: golfCourseId, posicion });
      })
      .catch(() => {
        // Sin red: se queda la copia, o se espera al GPS
      });
    return () => {
      vigente = false;
    };
  }, [activo, golfCourseId]);

  return delCampo.de === golfCourseId ? delCampo.posicion : copia;
}
