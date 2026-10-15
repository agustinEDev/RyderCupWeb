import IHoleMapCache from '../../domain/repositories/IHoleMapCache';

// La versión de la forma de lo guardado: si cambia, las copias viejas no se leen
const PREFIJO = 'mapaDeHoyos:v1:';
const clave = (golfCourseId) => `${PREFIJO}${golfCourseId}`;
// Los campos guardados, del más reciente al más antiguo
const INDICE = `${PREFIJO}indice`;
// Lo que cabe sin apretar al resto (la cola de golpes sin cobertura vive aquí también)
export const MAXIMO_DE_CAMPOS = 20;

const esMapaDe = (mapa, golfCourseId) =>
  Boolean(mapa) && mapa.golfCourseId === golfCourseId && typeof mapa.holes === 'object' && mapa.holes !== null;

const leerIndice = () => {
  try {
    const indice = JSON.parse(globalThis.localStorage.getItem(INDICE));
    return Array.isArray(indice) ? indice : [];
  } catch {
    return [];
  }
};

/**
 * El mapa de hoyos guardado en localStorage, por campo, solo los
 * `MAXIMO_DE_CAMPOS` más recientes.
 *
 * El almacenamiento puede no estar (modo privado) o estar lleno: entonces no
 * hay copia, y la anotación sigue como sin mapa. Nunca revienta la pantalla.
 */
class LocalStorageHoleMapCache extends IHoleMapCache {
  save(holeMap) {
    try {
      const id = holeMap.golfCourseId;
      globalThis.localStorage.setItem(clave(id), JSON.stringify(holeMap));
      const indice = [id, ...leerIndice().filter((otro) => otro !== id)];
      for (const viejo of indice.slice(MAXIMO_DE_CAMPOS)) globalThis.localStorage.removeItem(clave(viejo));
      globalThis.localStorage.setItem(INDICE, JSON.stringify(indice.slice(0, MAXIMO_DE_CAMPOS)));
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
      globalThis.localStorage.setItem(INDICE, JSON.stringify(leerIndice().filter((id) => id !== golfCourseId)));
    } catch {
      // Nada que borrar
    }
  }
}

export default LocalStorageHoleMapCache;
