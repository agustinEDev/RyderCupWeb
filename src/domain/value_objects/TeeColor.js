/**
 * Value Object: TeeColor
 *
 * Color de las barras de salida de un campo de golf.
 * Compatible con backend Python: TeeColor.
 *
 * Junto al género, identifica una salida. No la clasifica por dificultad: las
 * federaciones no publican categorías, y el reparto de colores varía entre
 * campos y entre países (en Pebble Beach el oro es de las más largas, en España
 * va a media tabla).
 *
 * OTHER cubre las salidas cuyo nombre no es un color: las "Championship"
 * británicas, las combinadas estadounidenses ("Gold/White") o las numeradas por
 * metros de algunos campos europeos. Esas llevan identificador propio.
 *
 * Inmutabilidad: Una vez creado, el valor no puede cambiar.
 */
class TeeColor {
  // ── Constantes ──────────────────────────────────────────────────────────────
  static RED = 'RED';
  static YELLOW = 'YELLOW';
  static BLUE = 'BLUE';
  static WHITE = 'WHITE';
  static GREEN = 'GREEN';
  static ORANGE = 'ORANGE';
  static BLACK = 'BLACK';
  static PINK = 'PINK';
  static GOLD = 'GOLD';
  static OTHER = 'OTHER';

  static #ALL_VALUES = [
    TeeColor.WHITE,
    TeeColor.YELLOW,
    TeeColor.BLUE,
    TeeColor.RED,
    TeeColor.BLACK,
    TeeColor.GREEN,
    TeeColor.ORANGE,
    TeeColor.PINK,
    TeeColor.GOLD,
    TeeColor.OTHER,
  ];

  /**
   * Color real de cada barra, para pintarla en la interfaz.
   * OTHER no tiene color propio: se representa en gris neutro.
   */
  static #SWATCHES = {
    RED: '#d16161',
    YELLOW: '#f6eb34',
    BLUE: '#65abd0',
    WHITE: '#f5f5f5',
    GREEN: '#9bbe65',
    ORANGE: '#f6b730',
    BLACK: '#000000',
    PINK: '#ed5faf',
    GOLD: '#d9c26c',
    OTHER: '#d2d2d2',
  };

  // ── Campo privado ────────────────────────────────────────────────────────────
  #value;

  /**
   * @param {string} value - Valor del color
   * @throws {Error} Si el valor no es un color válido
   */
  constructor(value) {
    if (!TeeColor.isValid(value)) {
      throw new Error(
        `Invalid TeeColor: "${value}". Valid values: ${TeeColor.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  /**
   * Crear desde string — usado en mappers al convertir API → Domain.
   *
   * @param {string} value
   * @returns {TeeColor}
   * @throws {Error} Si el valor es inválido
   */
  static fromString(value) {
    return new TeeColor(value);
  }

  // ── Helpers estáticos ────────────────────────────────────────────────────────
  /**
   * @param {string} value
   * @returns {boolean}
   */
  static isValid(value) {
    return TeeColor.#ALL_VALUES.includes(value);
  }

  /**
   * @returns {string[]} Copia del array de valores válidos, de más larga a más corta
   */
  static getAllValues() {
    return [...TeeColor.#ALL_VALUES];
  }

  /**
   * Color con el que pintar la barra en la interfaz.
   *
   * @param {string} value
   * @returns {string} Código hexadecimal
   */
  static swatchFor(value) {
    return TeeColor.#SWATCHES[value] ?? TeeColor.#SWATCHES.OTHER;
  }

  // ── Métodos de instancia ─────────────────────────────────────────────────────
  toString() {
    return this.#value;
  }

  /**
   * @param {TeeColor} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof TeeColor && other.toString() === this.#value;
  }
}

export default TeeColor;
