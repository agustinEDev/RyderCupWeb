/**
 * StrokePlaySetup - Lo que solo tiene un Stableford o un Medal (FE #824).
 *
 * La hermana de `RyderCupSetup`, como en el backend (RyderCupAm#251): una
 * competición de stroke play la tiene y una Ryder no. Lleva:
 *
 *   - Las categorías, de una de dos maneras (RyderCupAm#536, 10 oct 2026):
 *     límites de hándicap escritos a mano (12,0 y 26,0 son «hasta 12,0», «de
 *     12,1 a 26,0» y «más de 26,0») o N categorías iguales, que el backend
 *     reparte al cerrar las inscripciones.
 *   - En cuántas jornadas puede jugar cada jugador, una franja por jornada.
 *   - Cómo se calcula la general: acumulada o mejor tarjeta.
 *
 * Las reglas son las del backend, que es quien manda; aquí están para avisar
 * antes de enviar. Es inmutable.
 */

export const ACUMULADO = 'ACCUMULATED';
export const MEJOR_TARJETA = 'BEST_CARD';
const GENERALES = new Set([ACUMULADO, MEJOR_TARJETA]);

// Hasta 5 categorías: 4 límites
export const MAX_LIMITES = 4;
export const MIN_LIMITE = -10;
export const MAX_LIMITE = 54;
// Pedir una sola categoría iguales es no tener categorías
export const MIN_CATEGORIAS_IGUALES = 2;
export const MAX_CATEGORIAS_IGUALES = 5;
// Una categoría se disputa con 6 jugadores como mínimo, como en la RFEG
export const MIN_JUGADORES_POR_CATEGORIA = 6;

// En décimas y con enteros: 12,3 × 10 da 123,00000000000001 en coma flotante
const enDecimas = (valor) => Math.round(valor * 10);
const conUnDecimal = (valor) => Math.abs(valor * 10 - enDecimas(valor)) < 1e-9;

/**
 * El primer problema de unos límites, como clave de `create.errors`, o null.
 * @param {number[]} limites
 */
export const errorDeLimites = (limites) => {
  if (limites.length > MAX_LIMITES) return 'categoryLimitsTooMany';
  for (const limite of limites) {
    if (!Number.isFinite(limite) || limite < MIN_LIMITE || limite > MAX_LIMITE) {
      return 'categoryLimitRange';
    }
    if (!conUnDecimal(limite)) return 'categoryLimitOneDecimal';
  }
  if (limites.some((limite, i) => i > 0 && limite <= limites[i - 1])) {
    return 'categoryLimitsOrder';
  }
  return null;
};

/** Cuántas categorías iguales: entre 2 y 5. */
export const errorDeCategoriasIguales = (cuantas) =>
  Number.isInteger(cuantas) && cuantas >= MIN_CATEGORIAS_IGUALES && cuantas <= MAX_CATEGORIAS_IGUALES
    ? null
    : 'categoryCountRange';

/**
 * Las jornadas de cada jugador: al menos una, y no más que días tiene el
 * torneo (una franja por jornada).
 */
export const errorDeJornadas = (jornadas, dias) => {
  if (!Number.isInteger(jornadas) || jornadas < 1) return 'matchdaysRange';
  if (jornadas > dias) return 'matchdaysMoreThanDays';
  return null;
};

/**
 * Cómo quedan las categorías con unos límites: cada una con su «desde» y su
 * «hasta» (null donde no hay tope). «Hasta 12,0» incluye el 12,0, así que la
 * siguiente empieza en 12,1.
 * @param {number[]} limites
 * @returns {{numero: number, desde: number|null, hasta: number|null}[]}
 */
export const categoriasDeLosLimites = (limites) =>
  [...limites, null].map((hasta, i) => ({
    numero: i + 1,
    desde: i === 0 ? null : (enDecimas(limites[i - 1]) + 1) / 10,
    hasta,
  }));

export class StrokePlaySetup {
  #categoryLimits;
  #categoryCount;
  #maxMatchdaysPerPlayer;
  #overallStanding;

  /**
   * @param {Object} props
   * @param {number[]} [props.categoryLimits]
   * @param {number|null} [props.categoryCount] - Categorías iguales; null = límites a mano
   * @param {number} [props.maxMatchdaysPerPlayer]
   * @param {string} [props.overallStanding]
   */
  constructor({
    categoryLimits = [],
    categoryCount = null,
    maxMatchdaysPerPlayer = 1,
    overallStanding = ACUMULADO,
  }) {
    if (!GENERALES.has(overallStanding)) {
      throw new Error(`overallStanding must be ${ACUMULADO} or ${MEJOR_TARJETA}.`);
    }
    this.#categoryLimits = Object.freeze([...categoryLimits]);
    this.#categoryCount = categoryCount;
    this.#maxMatchdaysPerPlayer = maxMatchdaysPerPlayer;
    this.#overallStanding = overallStanding;
    Object.freeze(this);
  }

  get categoryLimits() {
    return this.#categoryLimits;
  }

  get categoryCount() {
    return this.#categoryCount;
  }

  get maxMatchdaysPerPlayer() {
    return this.#maxMatchdaysPerPlayer;
  }

  get overallStanding() {
    return this.#overallStanding;
  }

  /** Si las categorías son N iguales (las reparte el backend al cerrar). */
  get categoriasIguales() {
    return this.#categoryCount !== null;
  }
}
