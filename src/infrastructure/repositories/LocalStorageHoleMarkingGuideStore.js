import IHoleMarkingGuideStore from '../../domain/repositories/IHoleMarkingGuideStore';

const clave = (userId) => `guiaParaMarcarVista:v1:${userId}`;
const VISTA = '1';

/**
 * La guía vista, en localStorage y por usuario. Sin almacenamiento (modo
 * privado, lleno) cuenta como no vista: la guía vuelve a salir, pero nada
 * revienta.
 */
class LocalStorageHoleMarkingGuideStore extends IHoleMarkingGuideStore {
  yaVista(userId) {
    try {
      return globalThis.localStorage.getItem(clave(userId)) === VISTA;
    } catch {
      return false;
    }
  }

  marcarVista(userId) {
    try {
      globalThis.localStorage.setItem(clave(userId), VISTA);
    } catch {
      // Sin sitio: la verá otra vez
    }
  }
}

export default LocalStorageHoleMarkingGuideStore;
