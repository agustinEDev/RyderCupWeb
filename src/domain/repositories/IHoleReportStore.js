/* eslint-disable no-unused-vars */
/**
 * La cola de los reportes de hoyo que esperan a enviarse (entrega 7, 18 oct
 * 2026), de cada jugador: en un móvil compartido, la de uno solo sale con la
 * sesión de ese.
 *
 * Cada entrada: `{ id, golfCourseId, holeNumber, reason, tee, bends, greenCenter, enCola }`.
 * El `id` lo pone el mapa; `enCola` es la hora (ISO) en que entró.
 */
class IHoleReportStore {
  /** A la cola del jugador. Si ya estaba (mismo id), se cambia en su sitio. */
  ponerEnCola(userId, entrada) {
    throw new Error('Method not implemented: ponerEnCola');
  }

  /** Fuera de la cola ESA entrada (mismo id y hora). */
  quitarDeLaCola(userId, entrada) {
    throw new Error('Method not implemented: quitarDeLaCola');
  }

  /** @returns {Object[]} la cola del jugador, en el orden en que entró */
  cola(userId) {
    throw new Error('Method not implemented: cola');
  }
}

export default IHoleReportStore;
