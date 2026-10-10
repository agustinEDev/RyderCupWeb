import {
  errorDeLimites,
  errorDeCategoriasIguales,
  errorDeJornadas,
  ACUMULADO,
} from '../domain/value_objects/StrokePlaySetup';
import { numeroEntero } from './numeroEntero';

/**
 * Los ajustes de un Stableford o un Medal en el formulario (FE #824): de lo
 * que viene de la API a los campos, y de los campos a lo que se manda.
 *
 * Las categorías se hacen de una de dos maneras (RyderCupAm#536): límites a
 * mano o N iguales. El formulario guarda los dos por si se vuelve atrás, pero
 * solo se manda el modo elegido: el backend entiende unos límites, aunque
 * vacíos, como «pasar a límites a mano», y los dos juntos son un 400.
 */

export const LIMITES = 'LIMITES';
export const IGUALES = 'IGUALES';

const CATEGORIAS_IGUALES_POR_DEFECTO = '3';
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Los campos con los ajustes guardados, o con los de por defecto.
 * @param {{categoryLimits: number[], categoryCount: number|null, maxMatchdaysPerPlayer: number, overallStanding: string}|null} ajustes
 * @param {string} [separador] - El decimal del idioma: «12,0» o «12.0»
 */
export const formularioDeAjustes = (ajustes, separador = ',') => {
  const iguales = ajustes?.categoryCount != null;
  return {
    modo: iguales ? IGUALES : LIMITES,
    // En categorías iguales los límites son los del último cierre, que el
    // organizador no escribió: no se enseñan como suyos
    limites: iguales ? [] : (ajustes?.categoryLimits ?? []).map((l) => l.toFixed(1).replace('.', separador)),
    categoriasIguales: iguales ? String(ajustes.categoryCount) : CATEGORIAS_IGUALES_POR_DEFECTO,
    jornadas: String(ajustes?.maxMatchdaysPerPlayer ?? 1),
    general: ajustes?.overallStanding ?? ACUMULADO,
  };
};

/**
 * Cuántos días dura el torneo, contando el primero y el último, o null sin
 * fechas. En UTC, que es como se leen las fechas «AAAA-MM-DD»: así un cambio
 * de hora en medio no quita ni pone un día.
 */
export const diasDelTorneo = (inicio, fin) => {
  if (!inicio || !fin) return null;
  const dias = (Date.parse(fin) - Date.parse(inicio)) / UN_DIA_MS + 1;
  // Con el fin antes del inicio (a medio escribir) no hay torneo que medir: ese
  // error lo da la validación de las fechas, no «dura -1 días» (/code-review)
  return Number.isFinite(dias) && dias >= 1 ? dias : null;
};

/**
 * Cómo escribe los decimales un idioma: «,» o «.». Un idioma que Intl no
 * acepta (una etiqueta guardada con guion bajo) no rompe nada: coma.
 */
export const separadorDecimal = (idioma) => {
  try {
    // Sin idioma, el de la casa (español): no el del sistema de quien lo mira
    return (1.5).toLocaleString(idioma || 'es').charAt(1) === '.' ? '.' : ',';
  } catch {
    return ',';
  }
};

/** «12,0» o «12.0», con un decimal, según el idioma. */
export const formatoUnDecimal = (numero, idioma) => numero.toFixed(1).replace('.', separadorDecimal(idioma));

// Un número escrito como tal: signo, cifras y, si acaso, decimales con coma o
// punto. `Number` sola admitiría «1e1», «0x10» o «12.» (revisor)
const NUMERO_ESCRITO = /^[+-]?\d+([.,]\d+)?$/;

/** Un límite tal como se escribe, con coma o con punto; NaN si no es un número. */
export const limiteEscrito = (escrito) => {
  const limpio = String(escrito).trim();
  return NUMERO_ESCRITO.test(limpio) ? Number(limpio.replace(',', '.')) : NaN;
};

/** Si un límite está sin escribir: se acaba de añadir, no es un error de rango. */
export const limiteVacio = (escrito) => String(escrito).trim() === '';

const limitesDe = (formulario) => formulario.limites.map(limiteEscrito);

/**
 * El problema de las categorías, como clave de `create.errors`, o null. Del
 * modo elegido: lo escrito en el otro no se manda, así que no estorba.
 */
export const errorDeLasCategorias = (formulario) => {
  if (formulario.modo === IGUALES) {
    return errorDeCategoriasIguales(numeroEntero(formulario.categoriasIguales));
  }
  if (formulario.limites.some(limiteVacio)) return 'categoryLimitEmpty';
  return errorDeLimites(limitesDe(formulario));
};

/**
 * El problema de las jornadas por jugador, o null.
 * @param {number|null} dias - Los días del torneo; sin fechas no se comparan
 */
export const errorDeLasJornadas = (formulario, dias) =>
  errorDeJornadas(numeroEntero(formulario.jornadas) ?? NaN, dias ?? Infinity);

/** El primer problema de los ajustes (el que para el envío), o null. */
export const errorDeAjustes = (formulario, dias) =>
  errorDeLasCategorias(formulario) ?? errorDeLasJornadas(formulario, dias);

/** El `stroke_play` del POST de crear: solo el modo elegido. */
export const ajustesParaCrear = (formulario) => ({
  ...(formulario.modo === IGUALES
    ? { category_count: numeroEntero(formulario.categoriasIguales) }
    : { category_limits: limitesDe(formulario) }),
  max_matchdays_per_player: numeroEntero(formulario.jornadas),
  overall_standing: formulario.general,
});

const mismosLimites = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Lo que cambia respecto a lo guardado, para el PATCH; null si nada.
 */
export const cambiosDeAjustes = (original, formulario) => {
  const cambios = {};
  if (formulario.modo === IGUALES) {
    const cuantas = numeroEntero(formulario.categoriasIguales);
    if (cuantas !== original.categoryCount) cambios.categoryCount = cuantas;
  } else {
    const limites = limitesDe(formulario);
    // Venir de categorías iguales ya es un cambio, aunque no haya límites
    if (original.categoryCount != null || !mismosLimites(limites, original.categoryLimits)) {
      cambios.categoryLimits = limites;
    }
  }
  const jornadas = numeroEntero(formulario.jornadas);
  if (jornadas !== original.maxMatchdaysPerPlayer) cambios.maxMatchdaysPerPlayer = jornadas;
  if (formulario.general !== original.overallStanding) cambios.overallStanding = formulario.general;
  return Object.keys(cambios).length > 0 ? cambios : null;
};

/**
 * Al editar van dos peticiones: los datos generales y los ajustes. Los ajustes
 * primero, salvo que traigan más jornadas de las que caben en las fechas
 * guardadas: esas solo caben con las fechas nuevas. Así, acortar el torneo y
 * bajar las jornadas a la vez tampoco choca (el backend rechaza acortar por
 * debajo de las jornadas).
 */
export const primeroLosAjustes = (cambios, diasGuardados) =>
  cambios.maxMatchdaysPerPlayer === undefined || cambios.maxMatchdaysPerPlayer <= diasGuardados;
