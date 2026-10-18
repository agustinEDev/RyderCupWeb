import { esFalloDeTodaLaSesion, esRechazoDefinitivo, noLlegoAlServidor } from '../../../utils/politicaDeLaCola';
import { claveDelEnvio } from './enviarMuestraDeHoyo';

/**
 * Enviar un reporte de hoyo que ya está en la cola del móvil (entrega 7, 18 oct
 * 2026). Lo comparten enviar un reporte y vaciar la cola, con la misma política
 * que las muestras (`enviarMuestraDeHoyo`):
 * - llega (2xx): fuera de la cola, lo guarde el servidor o no;
 * - rechazo definitivo (4xx que no se arregla esperando): fuera de la cola y a
 *   Sentry, que el mapa no debería poder hacerlo;
 * - lo demás se queda; `paraLaTanda` si tumbaría también a los siguientes.
 *
 * @returns {Promise<{estado: 'enviado'|'pendiente'|'descartado'|'enVuelo'|'sustituido', paraLaTanda?: boolean, errorCode?: string|null}>}
 */
export const enviarReporteDeHoyo = async ({ golfCourseRepository, holeReportStore, reportarFallo, enVuelo }, userId, entrada) => {
  const clave = `reporte|${claveDelEnvio(userId, entrada)}`;
  if (enVuelo.has(clave)) return { estado: 'enVuelo' };
  if (!holeReportStore.cola(userId).some((otra) => otra.id === entrada.id && otra.enCola === entrada.enCola)) return { estado: 'sustituido' };
  enVuelo.add(clave);
  const { id, reason, golfCourseId, holeNumber, tee, bends, greenCenter } = entrada;
  try {
    await golfCourseRepository.sendHoleReport(golfCourseId, holeNumber, { id, reason, tee, bends, greenCenter });
    holeReportStore.quitarDeLaCola(userId, entrada);
    return { estado: 'enviado' };
  } catch (error) {
    if (esRechazoDefinitivo(error)) {
      holeReportStore.quitarDeLaCola(userId, entrada);
      const status = error?.status ?? error?.response?.status;
      const errorCode = error?.errorCode ?? null;
      reportarFallo(new Error(`Reporte de hoyo rechazado: ${status} ${errorCode ?? ''}`.trim()), { golfCourseId, holeNumber, status, errorCode });
      return { estado: 'descartado', errorCode };
    }
    const paraLaTanda = esFalloDeTodaLaSesion(error) || noLlegoAlServidor(error);
    if (!paraLaTanda) reportarFallo(error, { golfCourseId, holeNumber });
    return { estado: 'pendiente', paraLaTanda };
  } finally {
    enVuelo.delete(clave);
  }
};
