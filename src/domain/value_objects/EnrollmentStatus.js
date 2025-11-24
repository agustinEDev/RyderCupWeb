/**
 * Value Object: EnrollmentStatus
 *
 * Representa el estado de una inscripción (Enrollment).
 * Compatible con backend Python: EnrollmentStatus (Enum).
 *
 * Estados posibles (alineados con backend):
 * - REQUESTED: Usuario solicita unirse a competición
 * - INVITED: Creador invita a un usuario
 * - APPROVED: Inscripción aprobada (participando activamente)
 * - REJECTED: Solicitud/invitación rechazada
 * - CANCELLED: Usuario cancela su solicitud/invitación
 * - WITHDRAWN: Usuario se retira después de estar aprobado
 *
 * Transiciones válidas:
 * - REQUESTED → APPROVED | REJECTED | CANCELLED
 * - INVITED → APPROVED | REJECTED | CANCELLED
 * - APPROVED → WITHDRAWN
 * - REJECTED, CANCELLED, WITHDRAWN → (estados finales, sin transiciones)
 *
 * Responsabilidades:
 * - Garantizar que solo existan estados válidos
 * - Validar transiciones de estado según reglas de negocio
 * - Proporcionar métodos de consulta (is_pending, is_active, etc.)
 *
 * Inmutabilidad: Una vez creado, el valor no puede cambiar.
 */
class EnrollmentStatus {
  // Definición de estados como constantes estáticas
  static REQUESTED = 'REQUESTED';
  static INVITED = 'INVITED';
  static APPROVED = 'APPROVED';
  static REJECTED = 'REJECTED';
  static CANCELLED = 'CANCELLED';
  static WITHDRAWN = 'WITHDRAWN';

  // Mapa de transiciones válidas
  static VALID_TRANSITIONS = {
    [EnrollmentStatus.REQUESTED]: [
      EnrollmentStatus.APPROVED,
      EnrollmentStatus.REJECTED,
      EnrollmentStatus.CANCELLED,
    ],
    [EnrollmentStatus.INVITED]: [
      EnrollmentStatus.APPROVED,
      EnrollmentStatus.REJECTED,
      EnrollmentStatus.CANCELLED,
    ],
    [EnrollmentStatus.APPROVED]: [EnrollmentStatus.WITHDRAWN],
    // Estados finales (sin transiciones)
    [EnrollmentStatus.REJECTED]: [],
    [EnrollmentStatus.CANCELLED]: [],
    [EnrollmentStatus.WITHDRAWN]: [],
  };

  #value;

  /**
   * Constructor privado (usar factory methods o fromString)
   * @param {string} value - Valor del estado
   */
  constructor(value) {
    if (!EnrollmentStatus.isValid(value)) {
      throw new Error(
        `Invalid EnrollmentStatus: ${value}. ` +
          `Valid values: ${EnrollmentStatus.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  /**
   * Factory method: Crear estado REQUESTED
   * @returns {EnrollmentStatus}
   */
  static requested() {
    return new EnrollmentStatus(EnrollmentStatus.REQUESTED);
  }

  /**
   * Factory method: Crear estado INVITED
   * @returns {EnrollmentStatus}
   */
  static invited() {
    return new EnrollmentStatus(EnrollmentStatus.INVITED);
  }

  /**
   * Factory method: Crear estado APPROVED
   * @returns {EnrollmentStatus}
   */
  static approved() {
    return new EnrollmentStatus(EnrollmentStatus.APPROVED);
  }

  /**
   * Factory method: Crear estado REJECTED
   * @returns {EnrollmentStatus}
   */
  static rejected() {
    return new EnrollmentStatus(EnrollmentStatus.REJECTED);
  }

  /**
   * Factory method: Crear estado CANCELLED
   * @returns {EnrollmentStatus}
   */
  static cancelled() {
    return new EnrollmentStatus(EnrollmentStatus.CANCELLED);
  }

  /**
   * Factory method: Crear estado WITHDRAWN
   * @returns {EnrollmentStatus}
   */
  static withdrawn() {
    return new EnrollmentStatus(EnrollmentStatus.WITHDRAWN);
  }

  /**
   * Factory method: Crear desde string (útil para API responses)
   * @param {string} value - Valor del estado
   * @returns {EnrollmentStatus}
   */
  static fromString(value) {
    return new EnrollmentStatus(value);
  }

  /**
   * Verificar si un string es un estado válido
   * @param {string} value
   * @returns {boolean}
   */
  static isValid(value) {
    return EnrollmentStatus.getAllValues().includes(value);
  }

  /**
   * Obtener todos los valores posibles de estado
   * @returns {string[]}
   */
  static getAllValues() {
    return [
      EnrollmentStatus.REQUESTED,
      EnrollmentStatus.INVITED,
      EnrollmentStatus.APPROVED,
      EnrollmentStatus.REJECTED,
      EnrollmentStatus.CANCELLED,
      EnrollmentStatus.WITHDRAWN,
    ];
  }

  /**
   * Verificar si se puede transicionar al estado objetivo
   * @param {EnrollmentStatus} targetStatus - Estado objetivo
   * @returns {boolean}
   */
  canTransitionTo(targetStatus) {
    if (!(targetStatus instanceof EnrollmentStatus)) {
      throw new TypeError('targetStatus must be an EnrollmentStatus instance');
    }

    const allowedTransitions = EnrollmentStatus.VALID_TRANSITIONS[this.#value];
    return allowedTransitions.includes(targetStatus.toString());
  }

  /**
   * Validar que una transición sea válida (lanza error si no lo es)
   * @param {EnrollmentStatus} targetStatus
   * @throws {Error} Si la transición no es válida
   */
  validateTransition(targetStatus) {
    if (!this.canTransitionTo(targetStatus)) {
      throw new Error(
        `Invalid transition: ${this.#value} → ${targetStatus.toString()}. ` +
          `Allowed transitions: ${EnrollmentStatus.VALID_TRANSITIONS[this.#value].join(', ') || 'none'}`
      );
    }
  }

  // ===========================================
  // MÉTODOS DE CONSULTA (QUERIES)
  // ===========================================

  /**
   * Verifica si está pendiente de acción (REQUESTED o INVITED)
   * Equivalente a backend: status.is_pending()
   * @returns {boolean}
   */
  isPending() {
    return (
      this.#value === EnrollmentStatus.REQUESTED || this.#value === EnrollmentStatus.INVITED
    );
  }

  /**
   * Verifica si está activo/aprobado (APPROVED)
   * Equivalente a backend: status.is_active()
   * @returns {boolean}
   */
  isActive() {
    return this.#value === EnrollmentStatus.APPROVED;
  }

  /**
   * Verifica si fue rechazado
   * @returns {boolean}
   */
  isRejected() {
    return this.#value === EnrollmentStatus.REJECTED;
  }

  /**
   * Verifica si fue cancelado (por el usuario antes de estar aprobado)
   * @returns {boolean}
   */
  isCancelled() {
    return this.#value === EnrollmentStatus.CANCELLED;
  }

  /**
   * Verifica si fue retirado (por el usuario después de estar aprobado)
   * @returns {boolean}
   */
  isWithdrawn() {
    return this.#value === EnrollmentStatus.WITHDRAWN;
  }

  /**
   * Verifica si es un estado final (sin transiciones posibles)
   * @returns {boolean}
   */
  isFinal() {
    return (
      this.#value === EnrollmentStatus.REJECTED ||
      this.#value === EnrollmentStatus.CANCELLED ||
      this.#value === EnrollmentStatus.WITHDRAWN
    );
  }

  /**
   * Obtener el valor del estado como string
   * @returns {string}
   */
  toString() {
    return this.#value;
  }

  /**
   * Comparar dos estados por valor
   * @param {EnrollmentStatus} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof EnrollmentStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default EnrollmentStatus;
