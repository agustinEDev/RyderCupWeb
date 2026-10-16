import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHoleSamplesUseCase, sendHoleSampleUseCase } from '../composition';
import { MUESTRA_PENDIENTE, MUESTRAS_CAMBIADAS } from './useEnvioDeMuestras';

/**
 * Las muestras del campo para el mapa del hoyo (BE #532, marcado por par), y
 * cómo enviar una.
 *
 * - `muestras`: por hoyo, `{ primera, recoge }`. La copia del móvil al momento
 *   y la red la refresca. Un hoyo que no está es `{ primera: null, recoge: true }`.
 * - `pendientes`: por hoyo, la última muestra del jugador que aún espera en la
 *   cola (`{ tee, bends, greenCenter }`): una hecha sin cobertura se sigue viendo.
 * - `enviar(hoyo, { tee, bends, greenCenter })`: se dispara y se olvida. La
 *   promesa nunca se rechaza y el jugador no ve ningún aviso, salga o no.
 */
export function useMuestrasDelCampo({ golfCourseId, userId }) {
  const copiaDeMuestras = useMemo(() => getHoleSamplesUseCase.guardadas(golfCourseId), [golfCourseId]);
  const copiaDePendientes = useMemo(() => getHoleSamplesUseCase.pendientes(userId, golfCourseId), [userId, golfCourseId]);
  const [muestras, setMuestras] = useState({ de: null, muestras: {} });
  const [pendientes, setPendientes] = useState({ de: null, pendientes: {} });
  const de = `${userId}:${golfCourseId}`;
  // El campo y el jugador de ahora: un envío lento de otro no pisa su estado
  const deAhora = useRef({ de, golfCourseId });
  useEffect(() => {
    deAhora.current = { de, golfCourseId };
  }, [de, golfCourseId]);

  const refrescarMuestras = useCallback(async (campo) => {
    const nuevas = await getHoleSamplesUseCase.execute(campo);
    if (deAhora.current.golfCourseId === campo) setMuestras({ de: campo, muestras: nuevas });
  }, []);

  const refrescarPendientes = useCallback((jugador, campo) => {
    const clave = `${jugador}:${campo}`;
    if (deAhora.current.de !== clave) return;
    setPendientes({ de: clave, pendientes: getHoleSamplesUseCase.pendientes(jugador, campo) });
  }, []);

  useEffect(() => {
    if (!golfCourseId) return undefined;
    let vigente = true;
    const pedir = () =>
      getHoleSamplesUseCase
        .execute(golfCourseId)
        .then((nuevas) => {
          if (vigente) setMuestras({ de: golfCourseId, muestras: nuevas });
        })
        .catch(() => {
          // Se queda la copia del móvil
        });
    pedir();
    // Lo que la cola de fondo envía o descarta llega al mapa abierto
    const alCambiar = () => {
      setPendientes({ de: `${userId}:${golfCourseId}`, pendientes: getHoleSamplesUseCase.pendientes(userId, golfCourseId) });
      pedir();
    };
    globalThis.addEventListener(MUESTRAS_CAMBIADAS, alCambiar);
    return () => {
      vigente = false;
      globalThis.removeEventListener(MUESTRAS_CAMBIADAS, alCambiar);
    };
  }, [userId, golfCourseId]);

  const enviar = useCallback(
    async (holeNumber, { tee, bends, greenCenter } = {}) => {
      try {
        // Se ve en cuanto está en la cola: con mala cobertura el envío tarda
        const { estado } = await sendHoleSampleUseCase.execute({
          userId,
          golfCourseId,
          holeNumber,
          tee,
          bends,
          greenCenter,
          alQuedarEnCola: () => refrescarPendientes(userId, golfCourseId),
        });
        refrescarPendientes(userId, golfCourseId);
        if (estado === 'pendiente') globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
        // Puede ser la primera del hoyo, o la que cierra la recogida
        if (estado === 'enviada') await refrescarMuestras(golfCourseId);
      } catch {
        // Nunca se le dice nada al jugador: la muestra sigue en la cola si no salió
      }
    },
    [userId, golfCourseId, refrescarMuestras, refrescarPendientes],
  );

  return {
    muestras: muestras.de === golfCourseId ? muestras.muestras : copiaDeMuestras,
    pendientes: pendientes.de === de ? pendientes.pendientes : copiaDePendientes,
    enviar,
  };
}
