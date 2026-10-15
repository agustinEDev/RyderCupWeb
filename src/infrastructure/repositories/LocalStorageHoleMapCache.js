import IHoleMapCache from '../../domain/repositories/IHoleMapCache';

// La versión de la forma de lo guardado: si cambia, las copias viejas no se leen
const clave = (golfCourseId) => `mapaDeHoyos:v1:${golfCourseId}`;

const esMapaDe = (mapa, golfCourseId) =>
  Boolean(mapa) && mapa.golfCourseId === golfCourseId && typeof mapa.holes === 'object' && mapa.holes !== null;

/**
 * El mapa de hoyos guardado en localStorage, por campo.
 *
 * El almacenamiento puede no estar (modo privado) o estar lleno: entonces no
 * hay copia, y la anotación sigue como sin mapa. Nunca revienta la pantalla.
 */
class LocalStorageHoleMapCache extends IHoleMapCache {
  save(holeMap) {
    try {
      globalThis.localStorage.setItem(clave(holeMap.golfCourseId), JSON.stringify(holeMap));
    } catch {
      // Sin sitio: se queda sin copia
    }
  }

  load(golfCourseId) {
    try {
      const guardado = globalThis.localStorage.getItem(clave(golfCourseId));
      const mapa = guardado ? JSON.parse(guardado) : null;
      return esMapaDe(mapa, golfCourseId) ? mapa : null;
    } catch {
      return null;
    }
  }

  remove(golfCourseId) {
    try {
      globalThis.localStorage.removeItem(clave(golfCourseId));
    } catch {
      // Nada que borrar
    }
  }
}

export default LocalStorageHoleMapCache;
