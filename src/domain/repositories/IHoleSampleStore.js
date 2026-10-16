/* eslint-disable no-unused-vars */
/**
 * Las muestras de hoyo en el móvil (BE #532, marcado por par). Dos cosas:
 *
 * - El resumen de cada campo (la primera muestra de cada hoyo y si aún se
 *   recogen): es público, el mismo para cualquiera, y sin cobertura deja
 *   dibujar el hoyo.
 * - La cola de las que esperan a enviarse, de cada jugador: en un móvil
 *   compartido, la de uno solo sale con la sesión de ese. De cada hoyo, campo
 *   y barra se guarda solo la última: es la que el jugador ve en su mapa.
 *
 * Cada entrada de la cola: `{ id, golfCourseId, holeNumber, barra: { color, gender }, tee, bends, greenCenter, enCola }`.
 * El `id` lo pone el mapa (uno por cada vez que se marca el hoyo) y `enCola` es
 * la hora (ISO) en que entró: la misma muestra cambiada lleva el mismo id y
 * otra hora.
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

  /**
   * A la cola del jugador. Si ya estaba (mismo id), se cambia en su sitio; si
   * no, sustituye a la que hubiera del mismo hoyo, campo y barra.
   */
  ponerEnCola(userId, entrada) {
    throw new Error('Method not implemented: ponerEnCola');
  }

  /** Fuera de la cola ESA entrada (mismo id y hora): si ya la sustituyó otra, la otra se queda. */
  quitarDeLaCola(userId, entrada) {
    throw new Error('Method not implemented: quitarDeLaCola');
  }

  /** @returns {Object[]} la cola del jugador, en el orden en que entró */
  cola(userId) {
    throw new Error('Method not implemented: cola');
  }

  /**
   * La que ya llegó al servidor desde este móvil: el jugador solo ve lo suyo (o
   * lo aprobado), así que la sigue viendo. De cada hoyo, campo y barra, la última.
   */
  apuntarMia(userId, entrada) {
    throw new Error('Method not implemented: apuntarMia');
  }

  /** @returns {Object[]} las del jugador ya enviadas desde este móvil */
  mias(userId) {
    throw new Error('Method not implemented: mias');
  }
}

export default IHoleSampleStore;

