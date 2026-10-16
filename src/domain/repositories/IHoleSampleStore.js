/* eslint-disable no-unused-vars */
/**
 * Las muestras de hoyo en el móvil (BE #532, marcado por par). Dos cosas:
 *
 * - El resumen de cada campo (la primera muestra de cada hoyo y si aún se
 *   recogen): es público, el mismo para cualquiera, y sin cobertura deja
 *   dibujar el hoyo.
 * - La cola de las que esperan a enviarse, de cada jugador: en un móvil
 *   compartido, la de uno solo sale con la sesión de ese. De cada hoyo de cada
 *   campo se guarda solo la última: es la que el jugador ve en su mapa.
 *
 * Cada entrada de la cola: `{ golfCourseId, holeNumber, tee, bends, greenCenter, enCola }`,
 * con `enCola` la hora (ISO) en que entró, que la distingue de otra del mismo hoyo.
 */
class IHoleSampleStore {
  /** @returns {Object|null} el resumen guardado del campo, por número de hoyo */
  loadResumen(golfCourseId) {
    throw new Error('Method not implemented: loadResumen');
  }

  /** El resumen que acaba de dar el servidor. */
  saveResumen(golfCourseId, resumen) {
    throw new Error('Method not implemented: saveResumen');
  }

  /** A la cola del jugador, en lugar de la que hubiera del mismo hoyo y campo. */
  ponerEnCola(userId, entrada) {
    throw new Error('Method not implemented: ponerEnCola');
  }

  /** Fuera de la cola ESA entrada: si ya la sustituyó otra más nueva, la nueva se queda. */
  quitarDeLaCola(userId, entrada) {
    throw new Error('Method not implemented: quitarDeLaCola');
  }

  /** @returns {Object[]} la cola del jugador, en el orden en que entró */
  cola(userId) {
    throw new Error('Method not implemented: cola');
  }
}

export default IHoleSampleStore;
