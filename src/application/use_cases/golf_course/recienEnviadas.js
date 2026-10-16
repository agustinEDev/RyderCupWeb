import { esLaMismaBarra } from '../../../domain/services/muestrasDeLaBarra';

/**
 * Las muestras que acaban de llegar al servidor y que el resumen del móvil aún
 * no trae (BE #532, marcado por par).
 *
 * Sin esto, si tras un 2xx el resumen nuevo no llega (mala cobertura justo
 * después), la muestra salía de la cola y el mapa abierto se quedaba sin nada
 * en ese hoyo. Se siguen viendo como pendientes hasta el siguiente resumen de
 * su campo que cargue, diga lo que diga: el servidor ya la tiene en cuenta.
 *
 * Solo en memoria: no vuelven a la cola ni se envían otra vez. Las comparten
 * enviar, vaciar la cola y leer el resumen (una sola en composition).
 */
export const crearRecienEnviadas = () => {
  const apuntadas = [];
  // Cada apunte lleva su turno: un resumen pedido antes de que llegara una no
  // podía traerla, así que no la quita
  let turno = 0;
  return {
    apuntar(userId, { golfCourseId, holeNumber, barra, tee, bends, greenCenter }) {
      turno += 1;
      apuntadas.push({ turno, userId, golfCourseId, holeNumber, barra, puntos: { tee, bends, greenCenter } });
    },
    /** El turno de ahora: se mira al pedir el resumen. */
    turno: () => turno,
    /** El resumen del campo cargó: fuera las que llegaron antes de pedirlo. */
    olvidar(golfCourseId, hastaTurno) {
      for (let i = apuntadas.length - 1; i >= 0; i -= 1) {
        if (apuntadas[i].golfCourseId === golfCourseId && apuntadas[i].turno <= hastaTurno) apuntadas.splice(i, 1);
      }
    },
    /** @returns {Object<number, {tee, bends, greenCenter}>} las del jugador en ese campo y barra, por hoyo */
    de(userId, golfCourseId, barra) {
      return Object.fromEntries(
        apuntadas
          .filter((a) => a.userId === userId && a.golfCourseId === golfCourseId && esLaMismaBarra(a.barra, barra))
          .map((a) => [a.holeNumber, a.puntos]),
      );
    },
  };
};
