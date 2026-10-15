/* eslint-disable no-unused-vars */
/**
 * Copia del mapa de hoyos en el móvil, para tenerlo sin cobertura (BE #532).
 */
class IHoleMapCache {
  /** @param {Object} holeMap - el mapa del dominio */
  save(holeMap) {
    throw new Error('Method not implemented: save');
  }

  /** @returns {Object|null} el mapa guardado del campo, o null */
  load(golfCourseId) {
    throw new Error('Method not implemented: load');
  }

  remove(golfCourseId) {
    throw new Error('Method not implemented: remove');
  }
}

export default IHoleMapCache;
