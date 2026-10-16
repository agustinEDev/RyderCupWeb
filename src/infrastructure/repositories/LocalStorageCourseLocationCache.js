import ICourseLocationCache from '../../domain/repositories/ICourseLocationCache';

const clave = (golfCourseId) => `ubicacionDelCampo:v1:${golfCourseId}`;

/**
 * La ubicación de cada campo en localStorage. Sin almacenamiento (modo privado,
 * lleno) no hay copia, y el mapa espera a la red o al GPS: nunca revienta.
 */
class LocalStorageCourseLocationCache extends ICourseLocationCache {
  save(golfCourseId, ubicacion) {
    try {
      globalThis.localStorage.setItem(clave(golfCourseId), JSON.stringify(ubicacion));
    } catch {
      // Sin sitio: se pedirá la próxima vez
    }
  }

  load(golfCourseId) {
    try {
      return JSON.parse(globalThis.localStorage.getItem(clave(golfCourseId)));
    } catch {
      return null;
    }
  }
}

export default LocalStorageCourseLocationCache;
