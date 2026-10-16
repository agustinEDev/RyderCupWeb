import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHoleSamplesUseCase, sendHoleSampleUseCase } from '../composition';
import { MUESTRA_PENDIENTE, MUESTRAS_CAMBIADAS } from './useEnvioDeMuestras';

/**
 * Las muestras del campo para el mapa del hoyo, vistas desde la barra del
 * jugador (BE #532, marcado por par), y cómo enviar una.
 *
 * - `muestras`: por hoyo, `{ primera, deOtra, recoge }`: la primera muestra
 *   de MI barra, la primera de otra barra, y si la mía aún recoge. La copia
 *   del móvil al momento y la red la refresca. Un hoyo que no está es
 *   `{ primera: null, deOtra: null, recoge: true }`.
 * - `pendientes`: por hoyo, la última línea del jugador con su barra desde este
 *   móvil (`{ tee, bends, greenCenter }`): la que espera en la cola o, si no, la
 *   última ya enviada. Una hecha sin cobertura se sigue viendo, y la enviada
 *   también, cuando no hay otra que enseñar.
 * - `enviar(hoyo, { id, tee, bends, greenCenter })`: se dispara y se olvida, y
 *   el hook le pone la barra. La promesa nunca se rechaza y el jugador no ve
 *   ningún aviso, salga o no. Sin barra o sin jugador no hace nada.
 *
 * Cuando una muestra sale, `pendientes` y `muestras` cambian en el mismo
 * render: si no, el mapa abierto se quedaba un momento sin ninguna de las dos.
 *
 * @param {{golfCourseId: string, userId: string|null, barra: {color: string, gender: string|null}|null}} datos
 */
export function useMuestrasDelCampo({ golfCourseId, userId, barra }) {
  // La barra llega como objeto nuevo en cada render: cuenta lo que dice
  const color = barra?.color ?? null;
  const gender = barra?.gender ?? null;
  const miBarra = useMemo(() => (color ? { color, gender } : null), [color, gender]);
  const de = `${userId}|${golfCourseId}|${color}|${gender}`;
  const copiaDeMuestras = useMemo(() => getHoleSamplesUseCase.guardadas(golfCourseId, miBarra), [golfCourseId, miBarra]);
  const copiaDePendientes = useMemo(() => getHoleSamplesUseCase.pendientes(userId, golfCourseId, miBarra), [userId, golfCourseId, miBarra]);
  const [muestras, setMuestras] = useState({ de: null, muestras: {} });
  const [pendientes, setPendientes] = useState({ de: null, pendientes: {} });
  // El campo, el jugador y la barra de ahora: un envío lento de otro no pisa su estado
  const deAhora = useRef(de);
  useEffect(() => {
    deAhora.current = de;
  }, [de]);

  const refrescarPendientes = useCallback(
    (clave) => {
      if (deAhora.current !== clave) return;
      setPendientes({ de: clave, pendientes: getHoleSamplesUseCase.pendientes(userId, golfCourseId, miBarra) });
    },
    [userId, golfCourseId, miBarra],
  );

  // El resumen nuevo y lo que queda en la cola, a la vez
  // Sin red, `execute` ya devuelve la copia del móvil; si aun así fallara,
  // lo pendiente se refresca igual (y con ello la recién enviada sigue a la vista)
  const refrescarTodo = useCallback(
    async (clave) => {
      let nuevas = null;
      try {
        nuevas = await getHoleSamplesUseCase.execute(golfCourseId, miBarra);
      } catch {
        // Se queda la copia del móvil
      }
      if (deAhora.current !== clave) return;
      if (nuevas) setMuestras({ de: clave, muestras: nuevas });
      refrescarPendientes(clave);
    },
    [golfCourseId, miBarra, refrescarPendientes],
  );

  useEffect(() => {
    if (!golfCourseId) return undefined;
    let vigente = true;
    // También la primera vez, el resumen y lo pendiente a la vez: el resumen que
    // carga olvida las recién enviadas que ya trae
    getHoleSamplesUseCase
      .execute(golfCourseId, miBarra)
      .catch(() => null)
      .then((nuevas) => {
        if (!vigente) return;
        if (nuevas) setMuestras({ de, muestras: nuevas });
        setPendientes({ de, pendientes: getHoleSamplesUseCase.pendientes(userId, golfCourseId, miBarra) });
      });
    // Lo que la cola de fondo envía o descarta llega al mapa abierto
    const alCambiar = () => {
      if (vigente) refrescarTodo(de);
    };
    globalThis.addEventListener(MUESTRAS_CAMBIADAS, alCambiar);
    return () => {
      vigente = false;
      globalThis.removeEventListener(MUESTRAS_CAMBIADAS, alCambiar);
    };
  }, [de, userId, golfCourseId, miBarra, refrescarTodo]);

  const enviar = useCallback(
    async (holeNumber, { id, tee, bends, greenCenter } = {}) => {
      if (!userId || !miBarra) return;
      const clave = de;
      try {
        // Se ve en cuanto está en la cola: con mala cobertura el envío tarda
        const { estado } = await sendHoleSampleUseCase.execute({
          userId,
          golfCourseId,
          holeNumber,
          barra: miBarra,
          id,
          tee,
          bends,
          greenCenter,
          alQuedarEnCola: () => refrescarPendientes(clave),
        });
        if (estado === 'pendiente') globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
        // Puede ser la primera del hoyo, o la que cierra la recogida: la
        // pendiente se sigue viendo hasta que el resumen nuevo está aquí
        if (estado === 'enviada') await refrescarTodo(clave);
        else refrescarPendientes(clave);
      } catch {
        // Nunca se le dice nada al jugador: la muestra sigue en la cola si no salió
      }
    },
    [de, userId, golfCourseId, miBarra, refrescarPendientes, refrescarTodo],
  );

  return {
    muestras: muestras.de === de ? muestras.muestras : copiaDeMuestras,
    pendientes: pendientes.de === de ? pendientes.pendientes : copiaDePendientes,
    enviar,
  };
}
