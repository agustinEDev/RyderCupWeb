import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyHoleMarksUseCase, saveHoleMarkUseCase } from '../composition';

/**
 * Las marcas del jugador en el campo, por hoyo (BE #532, PR C), y cómo guardar
 * una. Las del móvil se dan al momento y la red las refresca; una recién hecha
 * se ve ya, haya o no cobertura.
 */
export function useMarcasDelCampo({ golfCourseId, userId }) {
  const copia = useMemo(() => getMyHoleMarksUseCase.guardadas(userId, golfCourseId), [userId, golfCourseId]);
  const [estado, setEstado] = useState({ de: null, marcas: {} });
  const de = `${userId}:${golfCourseId}`;

  useEffect(() => {
    if (!userId || !golfCourseId) return undefined;
    let vigente = true;
    getMyHoleMarksUseCase
      .execute(userId, golfCourseId)
      .then((marcas) => {
        if (vigente) setEstado({ de: `${userId}:${golfCourseId}`, marcas });
      })
      .catch(() => {
        // Se quedan las del móvil
      });
    return () => {
      vigente = false;
    };
  }, [userId, golfCourseId]);

  const guardar = useCallback(
    async ({ holeNumber, tee, bends, greenCenter }) => {
      const resultado = await saveHoleMarkUseCase.execute({ userId, golfCourseId, holeNumber, tee, bends, greenCenter });
      setEstado({ de: `${userId}:${golfCourseId}`, marcas: getMyHoleMarksUseCase.guardadas(userId, golfCourseId) });
      return resultado;
    },
    [userId, golfCourseId],
  );

  return { marcas: estado.de === de ? estado.marcas : copia, guardar };
}
