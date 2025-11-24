import { v4 as uuidv4 } from 'uuid';

/**
 * Value Object: EnrollmentId
 *
 * Representa el identificador único de una inscripción (Enrollment).
 * Compatible con backend Python: EnrollmentId (UUID v4).
 *
 * Responsabilidades:
 * - Encapsular el UUID de la inscripción
 * - Validar que el UUID tenga formato correcto
 * - Generar nuevos UUIDs cuando sea necesario
 *
 * Inmutabilidad: Una vez creado, el valor no puede cambiar.
 */
class EnrollmentId {
  #value;

  /**
   * Constructor privado (usar factory methods)
   * @param {string} value - UUID string
   */
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('EnrollmentId must be a non-empty string');
    }

    // Validar formato UUID (simple regex)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UUID format: ${value}`);
    }

    this.#value = value;
  }

  /**
   * Factory method: Crear un nuevo EnrollmentId generando un UUID
   * Equivalente a backend: EnrollmentId.generate()
   * @returns {EnrollmentId}
   */
  static create() {
    return new EnrollmentId(uuidv4());
  }

  /**
   * Factory method: Crear EnrollmentId desde un UUID existente
   * Equivalente a backend: EnrollmentId(uuid_str)
   * @param {string} uuid - UUID existente
   * @returns {EnrollmentId}
   */
  static fromString(uuid) {
    return new EnrollmentId(uuid);
  }

  /**
   * Obtener el valor del UUID
   * @returns {string}
   */
  toString() {
    return this.#value;
  }

  /**
   * Comparar dos EnrollmentIds por valor
   * @param {EnrollmentId} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof EnrollmentId)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default EnrollmentId;
