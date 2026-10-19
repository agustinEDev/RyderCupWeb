/* eslint-disable no-unused-vars */
/**
 * Copia en el móvil de la ubicación de cada campo (BE #532): es pública (la
 * misma que da la API a cualquiera), y sin cobertura dice dónde abrir el mapa
 * y si el jugador está lejos. Nunca la posición del jugador.
 */
class ICourseLocationCache {
  /** @param {string} golfCourseId @param {{lat: number, lon: number}} ubicacion */
  save(golfCourseId, ubicacion) {
    throw new Error('Method not implemented: save');
  }

  /** @returns {{lat: number, lon: number}|null} */
  load(golfCourseId) {
    throw new Error('Method not implemented: load');
  }
}

export default ICourseLocationCache;
