import { useEffect, useMemo, useState } from 'react';
import { getHoleMapUseCase } from '../composition';

/**
 * El mapa de hoyos aprobado del campo (BE #532), o `null` si no tiene.
 *
 * La copia del móvil se da al momento y la red la refresca: con mala cobertura
 * la petición no falla, se queda sin contestar, y la copia es para ese caso.
 */
export function useMapaDelCampo(golfCourseId) {
  const copia = useMemo(() => getHoleMapUseCase.guardado(golfCourseId), [golfCourseId]);
  const [delServidor, setDelServidor] = useState({ de: null, datos: null });

  useEffect(() => {
    if (!golfCourseId) return undefined;
    let vigente = true;
    getHoleMapUseCase
      .execute(golfCourseId)
      .then((datos) => {
        if (vigente) setDelServidor({ de: golfCourseId, datos });
      })
      .catch(() => {
        // Se queda la copia
      });
    return () => {
      vigente = false;
    };
  }, [golfCourseId]);

  return delServidor.de === golfCourseId ? delServidor.datos : copia;
}
