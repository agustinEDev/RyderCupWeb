import IHoleSampleStore from '../../domain/repositories/IHoleSampleStore';

// La versión de la forma de lo guardado: si cambia, las copias viejas no se leen.
// El resumen es por campo y de todos; la cola, por jugador. Al cerrar sesión la
// cola no se borra: sale cuando ese jugador vuelva a entrar
const claveDelResumen = (golfCourseId) => `muestrasDeHoyos:v1:${golfCourseId}`;
const claveDeLaCola = (userId) => `muestrasPendientes:v1:${userId}`;

const esObjeto = (valor) => Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
const esEntrada = (e) => esObjeto(e) && Boolean(e.golfCourseId) && Number.isInteger(e.holeNumber) && Boolean(e.enCola);
const delMismoHoyo = (a, b) => a.golfCourseId === b.golfCourseId && a.holeNumber === b.holeNumber;
const misma = (a, b) => delMismoHoyo(a, b) && a.enCola === b.enCola;

const leer = (clave) => {
  try {
    return JSON.parse(globalThis.localStorage.getItem(clave));
  } catch {
    return null;
  }
};

/** Las muestras de hoyo en localStorage (BE #532, marcado por par). */
class LocalStorageHoleSampleStore extends IHoleSampleStore {
  constructor() {
    super();
    // Si localStorage no deja escribir (lleno, o bloqueado en algún modo
    // privado), la copia de verdad pasa a ser esta: la muestra sigue en la cola
    // y el resumen sigue viéndose mientras la aplicación esté abierta
    this.enMemoria = new Map();
  }

  leer(clave) {
    if (this.enMemoria.has(clave)) return globalThis.structuredClone(this.enMemoria.get(clave));
    return leer(clave);
  }

  escribir(clave, valor) {
    try {
      globalThis.localStorage.setItem(clave, JSON.stringify(valor));
      this.enMemoria.delete(clave);
    } catch {
      this.enMemoria.set(clave, globalThis.structuredClone(valor));
    }
  }

  loadResumen(golfCourseId) {
    if (!golfCourseId) return null;
    const resumen = this.leer(claveDelResumen(golfCourseId));
    return esObjeto(resumen) ? resumen : null;
  }

  saveResumen(golfCourseId, resumen) {
    if (!golfCourseId) return;
    this.escribir(claveDelResumen(golfCourseId), resumen);
  }

  cola(userId) {
    if (!userId) return [];
    const cola = this.leer(claveDeLaCola(userId));
    return Array.isArray(cola) ? cola.filter(esEntrada) : [];
  }

  ponerEnCola(userId, entrada) {
    if (!userId) return;
    this.escribir(claveDeLaCola(userId), [...this.cola(userId).filter((otra) => !delMismoHoyo(otra, entrada)), entrada]);
  }

  quitarDeLaCola(userId, entrada) {
    if (!userId) return;
    this.escribir(
      claveDeLaCola(userId),
      this.cola(userId).filter((otra) => !misma(otra, entrada)),
    );
  }
}

export default LocalStorageHoleSampleStore;
