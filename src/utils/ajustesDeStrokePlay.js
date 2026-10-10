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
  return Number.isFinite(dias) ? dias : null;
};

/** Un límite tal como se escribe, con coma o con punto; NaN si no es un número. */
export const limiteEscrito = (escrito) => {
  const limpio = String(escrito).trim().replace(',', '.');
  return limpio === '' ? NaN : Number(limpio);
};

const limitesDe = (formulario) => formulario.limites.map(limiteEscrito);

/**
 * El primer problema de los ajustes, como clave de `create.errors`, o null.
 * Del modo elegido: lo escrito en el otro no se manda, así que no estorba.
 * @param {number|null} dias - Los días del torneo; sin fechas no se comparan
 */
export const errorDeAjustes = (formulario, dias) => {
  const deLasCategorias =
    formulario.modo === IGUALES
      ? errorDeCategoriasIguales(numeroEntero(formulario.categoriasIguales))
      : errorDeLimites(limitesDe(formulario));
  if (deLasCategorias) return deLasCategorias;
  const jornadas = numeroEntero(formulario.jornadas);
  return errorDeJornadas(jornadas ?? NaN, dias ?? Infinity);
};

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
