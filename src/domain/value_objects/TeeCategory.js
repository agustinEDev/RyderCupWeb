/**
 * Value Object: TeeCategory
 *
 * Representa la categoría de tee de un campo de golf.
 * Compatible con backend Python: TeeCategoryEnum.
 *
 * Valores posibles:
 * - CHAMPIONSHIP: Tee de campeonato (más largo, mayor dificultad)
 * - AMATEUR:      Tee amateur estándar
 * - SENIOR:       Tee para jugadores senior
 * - FORWARD:      Tee adelantado (menor distancia)
 * - JUNIOR:       Tee para jugadores junior
 *
 * Responsabilidades:
 * - Garantizar que solo existan categorías válidas
 * - Proporcionar conversión a string para serialización
 *
 * Inmutabilidad: Una vez creado, el valor no puede cambiar.
 */
class TeeCategory {
  // ── Constantes ──────────────────────────────────────────────────────────────
  static CHAMPIONSHIP = 'CHAMPIONSHIP';
  static AMATEUR = 'AMATEUR';
  static SENIOR = 'SENIOR';
  static FORWARD = 'FORWARD';
  static JUNIOR = 'JUNIOR';

  static #ALL_VALUES = [
    TeeCategory.CHAMPIONSHIP,
    TeeCategory.AMATEUR,
    TeeCategory.SENIOR,
    TeeCategory.FORWARD,
    TeeCategory.JUNIOR,
  ];

  // ── Campo privado ────────────────────────────────────────────────────────────
  #value;

  /**
   * @param {string} value - Valor de la categoría
   * @throws {Error} Si el valor no es una categoría válida
   */
  constructor(value) {
    if (!TeeCategory.isValid(value)) {
      throw new Error(
        `Invalid TeeCategory: "${value}". ` +
          `Valid values: ${TeeCategory.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  // ── Factory methods ──────────────────────────────────────────────────────────
  static championship() {
    return new TeeCategory(TeeCategory.CHAMPIONSHIP);
  }

  static amateur() {
    return new TeeCategory(TeeCategory.AMATEUR);
  }

  static senior() {
    return new TeeCategory(TeeCategory.SENIOR);
  }

  static forward() {
    return new TeeCategory(TeeCategory.FORWARD);
  }

  static junior() {
    return new TeeCategory(TeeCategory.JUNIOR);
  }

  /**
   * Crear desde string — usado en mappers al convertir API → Domain.
   * El caller es responsable de no pasar null/undefined (usar operador ternario).
   *
   * @param {string} value
   * @returns {TeeCategory}
   * @throws {Error} Si el valor es inválido
   */
  static fromString(value) {
    return new TeeCategory(value);
  }

  // ── Helpers estáticos ────────────────────────────────────────────────────────
  /**
   * @param {string} value
   * @returns {boolean}
   */
  static isValid(value) {
    return TeeCategory.#ALL_VALUES.includes(value);
  }

  /**
   * @returns {string[]} Copia del array de valores válidos
   */
  static getAllValues() {
    return [...TeeCategory.#ALL_VALUES];
  }

  // ── Métodos de instancia ─────────────────────────────────────────────────────
  toString() {
    return this.#value;
  }

  /**
   * @param {TeeCategory} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof TeeCategory && other.toString() === this.#value;
  }
}

export default TeeCategory;
