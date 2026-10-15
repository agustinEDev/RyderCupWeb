/* eslint-disable no-unused-vars */
/**
 * Las marcas de hoyo del jugador en el móvil (BE #532, PR C): las que ya tiene
 * el servidor y las que esperan a enviarse (sin cobertura). Cada una es de su
 * dueño: en un móvil compartido, la de uno no se ve ni se envía con la de otro.
 */
class IHoleMarkStore {
  /** @returns {{marcas: Object, pendientes: Object}} por número de hoyo */
  load(userId, golfCourseId) {
    throw new Error('Method not implemented: load');
  }

  /** La marca recién hecha: se ve ya y queda por enviar. */
  ponerPendiente(userId, golfCourseId, marca) {
    throw new Error('Method not implemented: ponerPendiente');
  }

  /** El servidor la aceptó: queda `guardada` (la que él tiene) y deja de estar pendiente. */
  confirmar(userId, golfCourseId, enviada, guardada) {
    throw new Error('Method not implemented: confirmar');
  }

  /** El servidor no la quiere (el hoyo ya tiene datos, o no es válida): fuera. */
  descartar(userId, golfCourseId, enviada) {
    throw new Error('Method not implemented: descartar');
  }

  /** Lo que tiene el servidor, sin pisar lo pendiente (que es más nuevo). */
  ponerDelServidor(userId, golfCourseId, marcas) {
    throw new Error('Method not implemented: ponerDelServidor');
  }

  /** @returns {{golfCourseId: string, marca: Object}[]} todo lo pendiente del jugador */
  pendientes(userId) {
    throw new Error('Method not implemented: pendientes');
  }
}

export default IHoleMarkStore;
