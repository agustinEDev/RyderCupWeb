import { useCallback } from 'react';
import { sendHoleReportUseCase } from '../composition';
import { MUESTRA_PENDIENTE } from './useEnvioDeMuestras';

/**
 * Reportar un hoyo desde su mapa (entrega 7, 18 oct 2026): el motivo y la línea
 * que propone el jugador, a la cola del móvil y al servidor. Sin jugador o sin
 * campo no hay con qué (null). Si se queda en la cola, la cola de fondo lo
 * reintenta con las muestras; un fallo nuestro va a Sentry desde el caso de uso
 * y aquí no rompe el mapa.
 *
 * @returns {((holeNumber: number, reporte: Object) => Promise<void>)|null}
 */
export const useReportarHoyo = ({ golfCourseId, userId }) => {
  const reportar = useCallback(
    async (holeNumber, reporte) => {
      try {
        const { estado } = await sendHoleReportUseCase.execute({ userId, golfCourseId, holeNumber, ...reporte });
        if (estado === 'pendiente') globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
      } catch {
        // Ya está en la cola o apuntado: el mapa sigue
      }
    },
    [golfCourseId, userId],
  );
  return userId && golfCourseId ? reportar : null;
};
