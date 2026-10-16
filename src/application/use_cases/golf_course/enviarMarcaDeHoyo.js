import { esFalloDeTodaLaSesion, esRechazoDefinitivo, noLlegoAlServidor } from '../../../utils/politicaDeLaCola';

/**
 * Enviar una marca de hoyo ya guardada en el móvil y apuntar lo que pasó (BE
 * #532, PR C). Lo comparten guardar una marca y vaciar las pendientes.
 *
 * Los fallos se leen con la política de la cola de golpes, para que las dos
 * colas no se desajusten:
 * - Llega: queda la que tiene el servidor, que puede ser otra más reciente.
 * - Rechazo definitivo (un 4xx que no se arregla esperando): el servidor no la
 *   quiere (el hoyo ya tiene salida y green, el campo no es visible, no es
 *   válida) y reintentarla no lo arregla: se descarta.
 * - Lo demás sigue pendiente. `paraLaTanda` dice si tumbaría también a las
 *   siguientes (sin red, el servidor caído, el tope de peticiones, la sesión o
 *   su CSRF): entonces no vale la pena seguir, y un 403 de CSRF no se repite
 *   una vez por marca (FE #521).
 *
 * @returns {Promise<{estado: 'guardada'|'pendiente'|'rechazada', marca: Object|null, errorCode?: string|null, paraLaTanda?: boolean}>}
 */
export const enviarMarcaDeHoyo = async ({ golfCourseRepository, holeMarkStore, reportarFallo }, userId, golfCourseId, marca) => {
  try {
    const guardada = await golfCourseRepository.saveHoleMark(golfCourseId, marca.holeNumber, marca);
    holeMarkStore.confirmar(userId, golfCourseId, marca, guardada);
    return { estado: 'guardada', marca: guardada };
  } catch (error) {
    if (esRechazoDefinitivo(error)) {
      holeMarkStore.descartar(userId, golfCourseId, marca);
      return { estado: 'rechazada', marca: null, errorCode: error.errorCode ?? null };
    }
    const paraLaTanda = esFalloDeTodaLaSesion(error) || noLlegoAlServidor(error);
    // Lo que no es de red ni del servidor es nuestro, y sin avisar nadie se enteraría
    if (!paraLaTanda) reportarFallo(error, { golfCourseId });
    return { estado: 'pendiente', marca, paraLaTanda };
  }
};
