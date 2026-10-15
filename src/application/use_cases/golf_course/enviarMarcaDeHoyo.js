/**
 * Enviar una marca de hoyo ya guardada en el móvil y apuntar lo que pasó (BE
 * #532, PR C). Lo comparten guardar una marca y vaciar las pendientes.
 *
 * - Llega: queda la que tiene el servidor, que puede ser otra más reciente.
 * - Sin red, el servidor caído (5xx), el tope de peticiones (429) o la sesión
 *   (401): sigue pendiente, y se reintenta con el siguiente vaciado.
 * - Cualquier otro 4xx: el servidor no la quiere (el hoyo ya tiene salida y
 *   green, el campo no es visible, no es válida) y reintentarla no lo arregla:
 *   se descarta.
 */

const SE_REINTENTA = new Set([401, 408, 429]);

const esDefinitivo = (error) => {
  const status = error?.status;
  return Number.isInteger(status) && status >= 400 && status < 500 && !SE_REINTENTA.has(status);
};

/**
 * @returns {Promise<{estado: 'guardada'|'pendiente'|'rechazada', marca: Object|null, errorCode?: string|null}>}
 */
export const enviarMarcaDeHoyo = async ({ golfCourseRepository, holeMarkStore, reportarFallo }, userId, golfCourseId, marca) => {
  try {
    const guardada = await golfCourseRepository.saveHoleMark(golfCourseId, marca.holeNumber, marca);
    holeMarkStore.confirmar(userId, golfCourseId, marca, guardada);
    return { estado: 'guardada', marca: guardada };
  } catch (error) {
    if (!esDefinitivo(error)) {
      // Sin red (lleva `cause`) o con un estado HTTP, ya se sabe por qué
      if (!error?.cause && !error?.status) reportarFallo(error, { golfCourseId });
      return { estado: 'pendiente', marca };
    }
    holeMarkStore.descartar(userId, golfCourseId, marca);
    return { estado: 'rechazada', marca: null, errorCode: error.errorCode ?? null };
  }
};
