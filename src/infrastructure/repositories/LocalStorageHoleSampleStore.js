import IHoleSampleStore from '../../domain/repositories/IHoleSampleStore';
import { esLaMismaBarra } from '../../domain/services/muestrasDeLaBarra';

// La versión de la forma de lo guardado: si cambia, las copias viejas no se leen.
// El resumen es por campo y de todos; la cola, por jugador. Al cerrar sesión la
// cola no se borra: sale cuando ese jugador vuelva a entrar
const claveDelResumen = (golfCourseId) => `muestrasDeHoyos:v2:${golfCourseId}`;
const claveDeLaCola = (userId) => `muestrasPendientes:v2:${userId}`;

// Lo que dejaron versiones anteriores y ya nadie lee: las marcas por jugador
// (que no llegaron a salir) y las muestras sin barra
const PREFIJOS_VIEJOS = ['marcasDeHoyos:v1:', 'muestrasDeHoyos:v1:', 'muestrasPendientes:v1:'];

const esObjeto = (valor) => Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
const esEntrada = (e) =>
  esObjeto(e) && Boolean(e.id) && Boolean(e.golfCourseId) && Number.isInteger(e.holeNumber) && Boolean(e.barra?.color) && Boolean(e.enCola);
const delMismoSitio = (a, b) => a.golfCourseId === b.golfCourseId && a.holeNumber === b.holeNumber && esLaMismaBarra(a.barra, b.barra);
// La misma versión de la misma muestra: si se cambió (mismo id, otra hora), es otra
const misma = (a, b) => a.id === b.id && a.enCola === b.enCola;

const leer = (clave) => {
  try {
    return JSON.parse(globalThis.localStorage.getItem(clave));
  } catch {
    return null;
  }
};

const olvidarLoViejo = () => {
  try {
    const almacen = globalThis.localStorage;
    const viejas = [];
    for (let i = 0; i < almacen.length; i += 1) {
      const clave = almacen.key(i);
      if (PREFIJOS_VIEJOS.some((prefijo) => clave?.startsWith(prefijo))) viejas.push(clave);
    }
    for (const clave of viejas) almacen.removeItem(clave);
  } catch {
    // Si no deja, se quedan: nadie las lee
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
    // Una vez, al arrancar la aplicación (aquí se crea una sola vez)
    olvidarLoViejo();
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
    const cola = this.cola(userId);
    const suSitio = cola.findIndex((otra) => otra.id === entrada.id);
    // La misma muestra otra vez (el mapa la manda al ocultarse y al cerrarse):
    // se cambia donde estaba. Otra del mismo hoyo y barra: solo vale la última
    const nueva =
      suSitio >= 0
        ? cola.map((otra, i) => (i === suSitio ? entrada : otra)).filter((otra, i) => i === suSitio || !delMismoSitio(otra, entrada))
        : [...cola.filter((otra) => !delMismoSitio(otra, entrada)), entrada];
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

export default LocalStorageHoleSampleStore;
