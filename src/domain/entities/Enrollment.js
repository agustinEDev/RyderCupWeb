import EnrollmentId from '../value_objects/EnrollmentId';
import EnrollmentStatus from '../value_objects/EnrollmentStatus';
import TeeColor from '../value_objects/TeeColor';

/**
 * Excepción para errores de estado de Enrollment
 */
export class EnrollmentStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnrollmentStateError';
  }
}

/**
 * Entity: Enrollment (Agregado Raíz)
 *
 * Representa una inscripción de un jugador a una competición.
 * Compatible con backend Python: Enrollment entity.
 *
 * Responsabilidades:
 * - Gestionar el ciclo de vida de la inscripción (solicitud → aprobación → retiro)
 * - Validar transiciones de estado según reglas de negocio
 * - Mantener invariantes (ej: custom_handicap en rango válido)
 * - Asignar jugadores a equipos
 * - Gestionar handicap personalizado
 *
 * Inmutabilidad (Frontend):
 * - Todos los métodos que cambian estado devuelven una NUEVA instancia
 * - Diferencia con backend: Python muta in-place, JS usa inmutabilidad
 *
 * Invariantes:
 * - enrollmentId, competitionId, userId nunca son null
 * - customHandicap debe estar entre -10.0 y 54.0 si está definido
 * - teamId puede ser null hasta que se asigne
 * - Las transiciones de estado deben ser válidas según EnrollmentStatus
 */
class Enrollment {
  #enrollmentId;
  #competitionId;
  #userId;
  #status;
  #teamId;
  #customHandicap;
  #color;
  #useRealName;
  #createdAt;
  #updatedAt;

  /**
   * Constructor privado (usar factory methods)
   *
   * @param {Object} props
   * @param {EnrollmentId} props.enrollmentId - ID único del enrollment
   * @param {string} props.competitionId - ID de la competición (UUID)
   * @param {string} props.userId - ID del usuario (UUID)
   * @param {EnrollmentStatus} props.status - Estado actual
   * @param {string|null} props.teamId - ID del equipo asignado (opcional)
   * @param {number|null} props.customHandicap - Handicap personalizado (opcional)
   * @param {boolean} props.useRealName - Si esta inscripción muestra el nombre legal en vez del alias (FE #571). Por defecto sí: en una competición manda el nombre legal salvo que el jugador pida su alias
   * @param {Date|string|null} props.createdAt - Fecha de creación
   * @param {Date|string|null} props.updatedAt - Fecha de última actualización
   */
  constructor({
    enrollmentId,
    competitionId,
    userId,
    status,
    teamId = null,
    customHandicap = null,
    color = null,
    useRealName = true,
    createdAt = null,
    updatedAt = null,
  }) {
    // Validaciones de entrada
    if (!(enrollmentId instanceof EnrollmentId)) {
      throw new TypeError('enrollmentId must be an EnrollmentId instance');
    }
    if (!competitionId || typeof competitionId !== 'string') {
      throw new TypeError('competitionId must be a non-empty string');
    }
    if (!userId || typeof userId !== 'string') {
      throw new TypeError('userId must be a non-empty string');
    }
    if (!(status instanceof EnrollmentStatus)) {
      throw new TypeError('status must be an EnrollmentStatus instance');
    }

    // Validar custom handicap si está presente
    if (customHandicap !== null) {
      this._validateCustomHandicap(customHandicap);
    }

    // Validar color si está presente
    if (color !== null && !(color instanceof TeeColor)) {
      throw new TypeError(
        `color must be a TeeColor instance or null, got: ${typeof color}`
      );
    }

    // La preferencia de nombre es un sí o un no: un `undefined` que se colara
    // aquí se leería como «alias» sin que nadie lo hubiera decidido
    if (typeof useRealName !== 'boolean') {
      throw new TypeError(`useRealName must be a boolean, got: ${typeof useRealName}`);
    }

    // Asignar campos privados
    this.#enrollmentId = enrollmentId;
    this.#competitionId = competitionId;
    this.#userId = userId;
    this.#status = status;
    this.#teamId = teamId;
    this.#customHandicap = customHandicap;
    this.#color = color;
    this.#useRealName = useRealName;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // ===========================================
  // FACTORY METHODS (Creación de instancias)
  // ===========================================

  /**
   * Factory: Crear solicitud de inscripción
   *
   * El usuario solicita unirse a una competición (estado REQUESTED).
   * Equivalente a backend: Enrollment.request()
   *
   * @param {Object} props
   * @param {EnrollmentId} props.enrollmentId
   * @param {string} props.competitionId
   * @param {string} props.userId
   * @returns {Enrollment}
   */
  static request({ enrollmentId, competitionId, userId }) {
    return new Enrollment({
      enrollmentId,
      competitionId,
      userId,
      status: EnrollmentStatus.requested(),
    });
  }

  /**
   * Factory: Crear invitación
   *
   * El creador invita a un usuario (estado INVITED).
   * Equivalente a backend: Enrollment.invite()
   *
   * @param {Object} props
   * @param {EnrollmentId} props.enrollmentId
   * @param {string} props.competitionId
   * @param {string} props.userId
   * @returns {Enrollment}
   */
  static invite({ enrollmentId, competitionId, userId }) {
    return new Enrollment({
      enrollmentId,
      competitionId,
      userId,
      status: EnrollmentStatus.invited(),
    });
  }

  /**
   * Factory: Inscripción directa (sin solicitud)
   *
   * El creador inscribe directamente a un usuario (estado APPROVED).
   * Equivalente a backend: Enrollment.direct_enroll()
   *
   * @param {Object} props
   * @param {EnrollmentId} props.enrollmentId
   * @param {string} props.competitionId
   * @param {string} props.userId
   * @param {number|null} props.customHandicap - Handicap personalizado (opcional)
   * @returns {Enrollment}
   */
  static directEnroll({ enrollmentId, competitionId, userId, customHandicap = null }) {
    return new Enrollment({
      enrollmentId,
      competitionId,
      userId,
      status: EnrollmentStatus.approved(),
      customHandicap,
    });
  }

  /**
   * Factory: Reconstruir desde datos persistidos (API, DB)
   *
   * Útil para mappers al reconstruir desde respuesta de API.
   *
   * @param {Object} props - Todos los campos del enrollment
   * @returns {Enrollment}
   */
  static fromPersistence(props) {
    return new Enrollment(props);
  }

  // ===========================================
  // GETTERS (Acceso a campos privados)
  // ===========================================

  get enrollmentId() {
    return this.#enrollmentId;
  }

  get competitionId() {
    return this.#competitionId;
  }

  get userId() {
    return this.#userId;
  }

  get status() {
    return this.#status;
  }

  get teamId() {
    return this.#teamId;
  }

  get customHandicap() {
    return this.#customHandicap;
  }

  get color() {
    return this.#color;
  }

  get useRealName() {
    return this.#useRealName;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  // ===========================================
  // MÉTODOS DE CONSULTA (QUERIES)
  // ===========================================

  /**
   * Verifica si está pendiente de acción (REQUESTED o INVITED)
   * @returns {boolean}
   */
  isPending() {
    return this.#status.isPending();
  }

  /**
   * Verifica si está aprobado/inscrito
   * @returns {boolean}
   */
  isApproved() {
    return this.#status.isActive();
  }

  /**
   * Verifica si fue rechazado
   * @returns {boolean}
   */
  isRejected() {
    return this.#status.isRejected();
  }

  /**
   * Verifica si fue cancelado
   * @returns {boolean}
   */
  isCancelled() {
    return this.#status.isCancelled();
  }

  /**
   * Verifica si fue retirado
   * @returns {boolean}
   */
  isWithdrawn() {
    return this.#status.isWithdrawn();
  }

  /**
   * Verifica si tiene equipo asignado
   * @returns {boolean}
   */
  hasTeamAssigned() {
    return this.#teamId !== null;
  }

  /**
   * Verifica si tiene handicap personalizado
   * @returns {boolean}
   */
  hasCustomHandicap() {
    return this.#customHandicap !== null;
  }

  // ===========================================
  // COPIA INMUTABLE
  // ===========================================

  /**
   * La misma inscripción con lo que se le pase cambiado.
   *
   * Existe porque siete métodos reconstruían la entidad enumerando campo a
   * campo: al añadir `useRealName` (FE #571) había que acordarse de los siete,
   * y el que se olvidara lo perdería en silencio en cuanto alguien aprobara la
   * inscripción o le asignara equipo. Aquí el campo se escribe una vez.
   *
   * `updatedAt` se refresca por defecto porque eso es lo que hacían los siete;
   * quien no quiera tocarlo, lo pasa en `cambios`.
   *
   * @param {Object} cambios - Campos a sobrescribir
   * @returns {Enrollment} Nueva instancia
   * @private
   */
  #copiaCon(cambios = {}) {
    return new Enrollment({
      enrollmentId: this.#enrollmentId,
      competitionId: this.#competitionId,
      userId: this.#userId,
      status: this.#status,
      teamId: this.#teamId,
      customHandicap: this.#customHandicap,
      color: this.#color,
      useRealName: this.#useRealName,
      createdAt: this.#createdAt,
      updatedAt: new Date(),
      ...cambios,
    });
  }

  // ===========================================
  // MÉTODOS DE COMANDO (TRANSICIONES DE ESTADO)
  // ===========================================

  /**
   * Aprobar inscripción
   *
   * Transiciones válidas:
   * - REQUESTED → APPROVED (aprobar solicitud)
   * - INVITED → APPROVED (aceptar invitación)
   *
   * @returns {Enrollment} Nueva instancia con estado APPROVED
   * @throws {EnrollmentStateError} Si la transición no es válida
   */
  approve() {
    const newStatus = EnrollmentStatus.approved();
    this.#status.validateTransition(newStatus);

    return this.#copiaCon({ status: newStatus });
  }

  /**
   * Rechazar inscripción
   *
   * Transiciones válidas:
   * - REQUESTED → REJECTED (rechazar solicitud)
   * - INVITED → REJECTED (declinar invitación)
   *
   * @returns {Enrollment} Nueva instancia con estado REJECTED
   * @throws {EnrollmentStateError} Si la transición no es válida
   */
  reject() {
    const newStatus = EnrollmentStatus.rejected();
    this.#status.validateTransition(newStatus);

    return this.#copiaCon({ status: newStatus });
  }

  /**
   * Cancelar solicitud/invitación
   *
   * Transiciones válidas:
   * - REQUESTED → CANCELLED (usuario cancela su solicitud)
   * - INVITED → CANCELLED (usuario declina invitación)
   *
   * @returns {Enrollment} Nueva instancia con estado CANCELLED
   * @throws {EnrollmentStateError} Si la transición no es válida
   */
  cancel() {
    const newStatus = EnrollmentStatus.cancelled();
    this.#status.validateTransition(newStatus);

    return this.#copiaCon({ status: newStatus });
  }

  /**
   * Retirarse de competición
   *
   * Transiciones válidas:
   * - APPROVED → WITHDRAWN (usuario se retira después de estar inscrito)
   *
   * @returns {Enrollment} Nueva instancia con estado WITHDRAWN
   * @throws {EnrollmentStateError} Si la transición no es válida
   */
  withdraw() {
    const newStatus = EnrollmentStatus.withdrawn();
    this.#status.validateTransition(newStatus);

    return this.#copiaCon({ status: newStatus });
  }

  // ===========================================
  // MÉTODOS DE ACTUALIZACIÓN (COMANDOS)
  // ===========================================

  /**
   * Asignar jugador a un equipo
   *
   * Solo permitido si está APPROVED.
   *
   * @param {string} teamId - ID del equipo (típicamente "1" o "2")
   * @returns {Enrollment} Nueva instancia con equipo asignado
   * @throws {EnrollmentStateError} Si no está aprobado
   * @throws {Error} Si teamId es inválido
   */
  assignToTeam(teamId) {
    if (!this.isApproved()) {
      throw new EnrollmentStateError(
        `Solo se pueden asignar equipos a enrollments aprobados. Estado actual: ${this.#status.toString()}`
      );
    }

    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
      throw new Error('El ID del equipo no puede estar vacío');
    }

    return this.#copiaCon({ teamId: teamId.trim() });
  }

  /**
   * Establecer handicap personalizado
   *
   * El creador puede override el handicap oficial del jugador.
   * Útil para equilibrar equipos o situaciones especiales.
   *
   * @param {number} handicap - Valor del handicap (-10.0 a 54.0)
   * @returns {Enrollment} Nueva instancia con handicap personalizado
   * @throws {Error} Si el handicap está fuera de rango
   */
  setCustomHandicap(handicap) {
    this._validateCustomHandicap(handicap);

    return this.#copiaCon({ customHandicap: handicap });
  }

  /**
   * Eliminar handicap personalizado
   *
   * Se usará el handicap oficial del usuario.
   *
   * @returns {Enrollment} Nueva instancia sin handicap personalizado
   */
  removeCustomHandicap() {
    return this.#copiaCon({ customHandicap: null });
  }

  /**
   * Elegir con qué nombre aparece el jugador en ESTA competición (FE #571).
   *
   * Decide el dueño de la inscripción, no quien la organiza —al revés que el
   * hándicap personalizado—, y se puede cambiar en cualquier momento, torneo
   * en marcha incluido. El backend es quien resuelve el nombre a partir de
   * esto: aquí solo se guarda la elección.
   *
   * @param {boolean} useRealName - true: nombre legal; false: alias
   * @returns {Enrollment} Nueva instancia con la preferencia elegida
   * @throws {TypeError} Si no es un booleano
   */
  setNamePreference(useRealName) {
    if (typeof useRealName !== 'boolean') {
      throw new TypeError(`useRealName must be a boolean, got: ${typeof useRealName}`);
    }

    return this.#copiaCon({ useRealName });
  }

  // ===========================================
  // VALIDACIONES PRIVADAS
  // ===========================================

  /**
   * Valida que el handicap personalizado esté en rango válido
   *
   * @param {number} handicap
   * @throws {Error} Si está fuera de rango
   * @private
   */
  _validateCustomHandicap(handicap) {
    if (typeof handicap !== 'number' || isNaN(handicap)) {
      throw new Error('El handicap debe ser un número válido');
    }

    const MIN_HANDICAP = -10.0;
    const MAX_HANDICAP = 54.0;

    if (handicap < MIN_HANDICAP || handicap > MAX_HANDICAP) {
      throw new Error(
        `El hándicap personalizado debe estar entre ${MIN_HANDICAP} y ${MAX_HANDICAP}. ` +
          `Se recibió: ${handicap}`
      );
    }
  }

  // ===========================================
  // CONVERSIÓN Y SERIALIZACIÓN
  // ===========================================

  /**
   * Convertir a objeto simple para persistencia (API, DB)
   *
   * Útil para mappers al enviar a la API.
   *
   * @returns {Object} Representación plana del enrollment
   */
  toPersistence() {
    return {
      enrollmentId: this.#enrollmentId.toString(),
      competitionId: this.#competitionId,
      userId: this.#userId,
      status: this.#status.toString(),
      teamId: this.#teamId,
      customHandicap: this.#customHandicap,
      color: this.#color?.toString() ?? null,
      useRealName: this.#useRealName,
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
    };
  }

  /**
   * Comparar dos enrollments por identidad (ID)
   *
   * @param {Enrollment} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof Enrollment)) {
      return false;
    }
    return this.#enrollmentId.equals(other.#enrollmentId);
  }

  /**
   * Representación string legible
   *
   * @returns {string}
   */
  toString() {
    return `Enrollment(${this.#enrollmentId.toString()}, User: ${this.#userId}, Competition: ${this.#competitionId}, Status: ${this.#status.toString()})`;
  }
}

export default Enrollment;
