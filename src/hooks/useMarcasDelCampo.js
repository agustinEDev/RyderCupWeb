import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMyHoleMarksUseCase, saveHoleMarkUseCase } from '../composition';
import { MARCA_PENDIENTE, MARCAS_CAMBIADAS } from './useEnvioDeMarcas';

/**
 * Las marcas del jugador en el campo, por hoyo (BE #532, PR C), y cómo guardar
 * una. Las del móvil se dan al momento y la red las refresca; una recién hecha
 * se ve ya, haya o no cobertura.
 */
export function useMarcasDelCampo({ golfCourseId, userId }) {
  const copia = useMemo(() => getMyHoleMarksUseCase.guardadas(userId, golfCourseId), [userId, golfCourseId]);
  const [estado, setEstado] = useState({ de: null, marcas: {} });
  const de = `${userId}:${golfCourseId}`;
  // El campo y el jugador de ahora: un envío lento de otro no pisa su estado
  const deAhora = useRef(de);
  useEffect(() => {
    deAhora.current = de;
  }, [de]);

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
    // Lo que la cola de fondo envía o descarta llega al mapa abierto
    const alCambiar = () => setEstado({ de: `${userId}:${golfCourseId}`, marcas: getMyHoleMarksUseCase.guardadas(userId, golfCourseId) });
    globalThis.addEventListener(MARCAS_CAMBIADAS, alCambiar);
    return () => {
      vigente = false;
      globalThis.removeEventListener(MARCAS_CAMBIADAS, alCambiar);
    };
  }, [userId, golfCourseId]);

  const guardar = useCallback(
    async ({ holeNumber, tee, bends, greenCenter }) => {
      const clave = `${userId}:${golfCourseId}`;
      const refrescar = () => {
        if (deAhora.current !== clave) return;
        setEstado({ de: clave, marcas: getMyHoleMarksUseCase.guardadas(userId, golfCourseId) });
      };
      // Se ve en cuanto está en el móvil: con mala cobertura el envío tarda
      const resultado = await saveHoleMarkUseCase.execute({
        userId,
        golfCourseId,
        holeNumber,
        tee,
        bends,
        greenCenter,
        alGuardarEnElMovil: refrescar,
      });
      refrescar();
      if (resultado.estado === 'pendiente') globalThis.dispatchEvent(new globalThis.CustomEvent(MARCA_PENDIENTE));
      return resultado;
    },
    [userId, golfCourseId],
  );

  return { marcas: estado.de === de ? estado.marcas : copia, guardar };
}
