import { esFalloDeTodaLaSesion, esRechazoDefinitivo, noLlegoAlServidor } from '../../../utils/politicaDeLaCola';

/** Lo que identifica una entrada de la cola mientras va de camino. */
export const claveDelEnvio = (userId, { golfCourseId, holeNumber, enCola }) => `${userId}|${golfCourseId}|${holeNumber}|${enCola}`;

/**
 * Enviar una muestra de hoyo que ya está en la cola del móvil y apuntar lo que
 * pasó (BE #532, marcado por par). Lo comparten enviar una muestra y vaciar la
 * cola. El jugador no se entera de nada de esto: ni avisos ni mensajes.
 *
 * Los fallos se leen con la política de la cola de golpes, para que las colas
 * no se desajusten:
 * - Llega (2xx): fuera de la cola. El servidor contesta igual si la guarda que
 *   si ya no la quiere, y para el móvil las dos cosas son lo mismo.
 * - Rechazo definitivo (un 4xx que no se arregla esperando: el campo no
 *   existe, el hoyo no es del campo, no es válida): reintentarla no lo arregla,
 *   y es un fallo nuestro, porque el mapa no debería poder hacerla. Fuera de la
 *   cola, sin decir nada al jugador, y a Sentry.
 * - Lo demás se queda en la cola. `paraLaTanda` dice si tumbaría también a las
 *   siguientes (sin red, el servidor caído, el tope de peticiones, la sesión o
 *   su CSRF): entonces no vale la pena seguir, y un 403 de CSRF no se repite
 *   una vez por muestra (FE #521).
 *
 * `enVuelo` son las que van de camino: compartido entre enviar y vaciar, para
 * que la tanda no mande otra vez una que ya está saliendo (cada envío cuenta
 * en el servidor como una muestra más).
 *
 * @returns {Promise<{estado: 'enviada'|'pendiente'|'descartada'|'enVuelo', paraLaTanda?: boolean, errorCode?: string|null}>}
 */
export const enviarMuestraDeHoyo = async ({ golfCourseRepository, holeSampleStore, reportarFallo, enVuelo }, userId, entrada) => {
  const clave = claveDelEnvio(userId, entrada);
  if (enVuelo.has(clave)) return { estado: 'enVuelo' };
  enVuelo.add(clave);
  const { golfCourseId, holeNumber, tee, bends, greenCenter } = entrada;
  try {
    await golfCourseRepository.sendHoleSample(golfCourseId, holeNumber, { tee, bends, greenCenter });
    holeSampleStore.quitarDeLaCola(userId, entrada);
    return { estado: 'enviada' };
  } catch (error) {
    if (esRechazoDefinitivo(error)) {
      holeSampleStore.quitarDeLaCola(userId, entrada);
      const status = error?.status ?? error?.response?.status;
      const errorCode = error?.errorCode ?? null;
      reportarFallo(new Error(`Muestra de hoyo rechazada: ${status} ${errorCode ?? ''}`.trim()), { golfCourseId, holeNumber, status, errorCode });
      return { estado: 'descartada', errorCode };
    }
    const paraLaTanda = esFalloDeTodaLaSesion(error) || noLlegoAlServidor(error);
    // Lo que no es de red ni del servidor es nuestro, y sin avisar nadie se enteraría
    if (!paraLaTanda) reportarFallo(error, { golfCourseId, holeNumber });
    return { estado: 'pendiente', paraLaTanda };
  } finally {
    enVuelo.delete(clave);
  }
};
