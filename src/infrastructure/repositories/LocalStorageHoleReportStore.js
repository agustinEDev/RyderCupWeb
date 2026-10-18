import IHoleReportStore from '../../domain/repositories/IHoleReportStore';

const claveDeLaCola = (userId) => `reportesDeHoyosPendientes:v1:${userId}`;

const esEntrada = (e) =>
  Boolean(e) && typeof e === 'object' && Boolean(e.id) && Boolean(e.golfCourseId) && Number.isInteger(e.holeNumber) && Boolean(e.reason) && Boolean(e.enCola);
const misma = (a, b) => a.id === b.id && a.enCola === b.enCola;

/** La cola de los reportes de hoyo en localStorage (entrega 7, 18 oct 2026). */
class LocalStorageHoleReportStore extends IHoleReportStore {
  constructor() {
    super();
    // Si localStorage no deja escribir (lleno, o bloqueado en algún modo
    // privado), la copia de verdad pasa a ser esta mientras la app esté abierta
    this.enMemoria = new Map();
  }

  leer(clave) {
    if (this.enMemoria.has(clave)) return globalThis.structuredClone(this.enMemoria.get(clave));
    try {
      return JSON.parse(globalThis.localStorage.getItem(clave));
    } catch {
      return null;
    }
  }

  escribir(clave, valor) {
    try {
      globalThis.localStorage.setItem(clave, JSON.stringify(valor));
      this.enMemoria.delete(clave);
    } catch {
      this.enMemoria.set(clave, globalThis.structuredClone(valor));
    }
  }

  cola(userId) {
    if (!userId) return [];
    const cola = this.leer(claveDeLaCola(userId));
    return Array.isArray(cola) ? cola.filter(esEntrada) : [];
  }

  ponerEnCola(userId, entrada) {
    if (!userId) return;
    const cola = this.cola(userId);
    const suSitio = cola.findIndex((otra) => otra.id === entrada.id);
    const nueva = suSitio >= 0 ? cola.map((otra, i) => (i === suSitio ? entrada : otra)) : [...cola, entrada];
    this.escribir(claveDeLaCola(userId), nueva);
  }

  quitarDeLaCola(userId, entrada) {
    if (!userId) return;
    this.escribir(
      claveDeLaCola(userId),
      this.cola(userId).filter((otra) => !misma(otra, entrada)),
    );
  }
}

export default LocalStorageHoleReportStore;
