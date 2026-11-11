/**
 * La anotación en curso, para volver a ella si iOS cierra la app (11 nov 2026).
 *
 * En el campo, iOS cierra la app instalada cuando le falta memoria o lleva rato con la
 * pantalla bloqueada; al abrirla arranca de cero, en el panel y en el hoyo 1. Aquí se
 * apunta dónde se estaba anotando —la ruta, la pestaña, el hoyo y si el mapa estaba
 * abierto— en `localStorage`, que sí sobrevive a ese cierre (`sessionStorage`, donde vive
 * la vuelta tras entrar, no).
 *
 * Es la ÚNICA pieza que toca ese almacenamiento: las pantallas solo dicen dónde están
 * (`useAnotacionEnCurso`) y el arranque pregunta a dónde volver (`vueltaTrasEntrar`).
 *
 * Las reglas (tabla aprobada por Agustín el 11 nov 2026):
 * - Solo las tres rutas de anotación con un uuid, y en la de grupo solo su
 *   `?competition=<uuid>`: una lista cerrada, para que lo guardado no pueda mandar a otra
 *   parte (B9). Lo que no la cumple ni se guarda ni, si se encuentra, vale: se borra.
 * - Es de una cuenta: con otra, o sin ninguna, no vale y se borra (B3).
 * - Vale 6 horas desde la última vez en la anotación (B2).
 * - Se borra en todos los cierres de sesión, desde el registro único de limpiezas (C1).
 */

import { TODAS_LAS_PESTANAS_DE_ANOTACION } from './pestanasDeLaAnotacion';

const CLAVE = 'anotacion_en_curso';
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const RUTAS = [
  { tipo: 'partido', ruta: new RegExp(`^/player/matches/${UUID}/scoring$`, 'i'), busqueda: /^$/ },
  {
    tipo: 'grupo',
    ruta: new RegExp(`^/player/groups/${UUID}/scoring$`, 'i'),
    busqueda: new RegExp(`^(\\?competition=${UUID})?$`, 'i'),
  },
  { tipo: 'rapida', ruta: new RegExp(`^/quick-matches/${UUID}/scoring$`, 'i'), busqueda: /^$/ },
];
// Las pestañas de las tres anotaciones, las mismas que pintan sus pantallas
const PESTANAS = TODAS_LAS_PESTANAS_DE_ANOTACION;
const HOYO_MAXIMO = 36;

/** El tipo de anotación de una ruta y su búsqueda, o `null` si no es una de las tres. */
const tipoDe = (pathname, search) => {
  const cual = RUTAS.find((r) => r.ruta.test(pathname ?? '') && r.busqueda.test(search ?? ''));
  return cual ? cual.tipo : null;
};

const hoyoValido = (hoyo) => Number.isInteger(hoyo) && hoyo >= 1 && hoyo <= HOYO_MAXIMO;

/**
 * Separa una ruta guardada en su camino y su búsqueda. Otra dirección (`https://…`,
 * `//otro`) no pasa después la lista cerrada, que exige empezar por una de las tres rutas.
 */
const partes = (ruta) => {
  if (typeof ruta !== 'string') return null;
  const corte = ruta.indexOf('?');
  return corte === -1 ? { pathname: ruta, search: '' } : { pathname: ruta.slice(0, corte), search: ruta.slice(corte) };
};

/** La olvida: al salir de la anotación, al terminarla y en todos los cierres de sesión. */
export const olvidaLaAnotacionEnCurso = () => {
  try {
    globalThis.localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento no hay nada que borrar
  }
};

/**
 * La olvida solo si lo guardado es de esa anotación: al salir de una pantalla, sin borrar
 * lo que otra pestaña guardó de otra (CodeRabbit, 11 nov 2026).
 */
export const olvidaEstaAnotacionEnCurso = ({ pathname, search = '' }) => {
  try {
    const guardado = JSON.parse(globalThis.localStorage.getItem(CLAVE));
    if (guardado?.ruta === `${pathname}${search}`) olvidaLaAnotacionEnCurso();
  } catch {
    // Algo ilegible: lo borrará quien lo lea
  }
};

/**
 * Apunta dónde se está anotando, con la hora: sustituye a lo anterior. Si no es una de
 * las tres anotaciones, o no hay cuenta, no apunta nada.
 */
export const guardaLaAnotacionEnCurso = ({ cuenta, pathname, search = '', pestana, hoyo, mapa }, ahora = Date.now()) => {
  if (cuenta == null || !tipoDe(pathname, search)) return;
  if (!PESTANAS.has(pestana) || !hoyoValido(hoyo) || typeof mapa !== 'boolean') return;
  try {
    globalThis.localStorage.setItem(
      CLAVE,
      JSON.stringify({ cuenta: String(cuenta), ruta: `${pathname}${search}`, pestana, hoyo, mapa, hora: ahora }),
    );
  } catch {
    // Sin almacenamiento (privado, lleno) se arranca en el panel, como siempre
  }
};

/**
 * Lo guardado si vale para esa cuenta ahora, o `null`. Lo que no vale (otra cuenta,
 * pasadas 6 h, una hora del futuro, una ruta fuera de la lista, algo corrupto) se borra;
 * sin cuenta con la que comparar, solo no vale.
 */
const valido = (cuenta, ahora) => {
  // Sin saber aún de quién es la sesión (un instante en la vuelta de Google) no se puede
  // comparar: no vale, pero tampoco se borra lo de la cuenta que está entrando
  if (cuenta == null) return null;
  let guardado = null;
  try {
    const texto = globalThis.localStorage.getItem(CLAVE);
    if (texto === null) return null;
    guardado = JSON.parse(texto);
  } catch {
    olvidaLaAnotacionEnCurso();
    return null;
  }
  const ruta = partes(guardado?.ruta);
  const tipo = ruta ? tipoDe(ruta.pathname, ruta.search) : null;
  const edad = ahora - guardado?.hora;
  const vale =
    tipo !== null &&
    guardado.cuenta === String(cuenta) &&
    PESTANAS.has(guardado.pestana) &&
    hoyoValido(guardado.hoyo) &&
    typeof guardado.mapa === 'boolean' &&
    typeof guardado.hora === 'number' &&
    edad >= 0 &&
    edad < SEIS_HORAS_MS;
  if (!vale) {
    olvidaLaAnotacionEnCurso();
    return null;
  }
  return { ...guardado, tipo, edad };
};

/**
 * A dónde volver al arrancar: la anotación de esa cuenta, con su pestaña, su hoyo, el
 * mapa y los minutos que la app estuvo cerrada; o `null`.
 * @returns {{ruta: string, tipo: string, pestana: string, hoyo: number, mapa: boolean, minutos: number}|null}
 */
export const leeLaAnotacionEnCurso = ({ cuenta }, ahora = Date.now()) => {
  const guardado = valido(cuenta, ahora);
  if (!guardado) return null;
  const { ruta, tipo, pestana, hoyo, mapa, edad } = guardado;
  return { ruta, tipo, pestana, hoyo, mapa, minutos: Math.floor(edad / 60000) };
};

/**
 * Al cargar una anotación (arranque en frío, recarga por versión nueva…): su pestaña, su
 * hoyo y el mapa si lo guardado es de ESTA anotación y de esa cuenta; si no, `null`.
 * Lo guardado de otra anotación no se toca: se sustituye al guardar esta.
 */
export const estadoDeEstaAnotacion = ({ cuenta, pathname, search = '' }, ahora = Date.now()) => {
  const guardado = valido(cuenta, ahora);
  if (!guardado || guardado.ruta !== `${pathname}${search}`) return null;
  return { pestana: guardado.pestana, hoyo: guardado.hoyo, mapa: guardado.mapa };
};
