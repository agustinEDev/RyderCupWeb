/**
 * Interface: IEnrollmentRepository
 *
 * Define el contrato de persistencia para Enrollments.
 * Compatible con backend Python: IEnrollmentRepository (Abstract Base Class).
 *
 * Responsabilidades:
 * - Definir operaciones de persistencia (CRUD + queries)
 * - Establecer firmas de métodos (parámetros y retornos)
 * - NO contiene implementación (eso va en Infrastructure Layer)
 *
 * Principio de Inversión de Dependencias:
 * - El Domain Layer define el contrato (esta interfaz)
 * - El Infrastructure Layer implementa el contrato (ApiEnrollmentRepository)
 * - Los Use Cases dependen de la interfaz, NO de la implementación
 *
 * Implementaciones esperadas:
 * - ApiEnrollmentRepository (REST API con fetch)
 * - MockEnrollmentRepository (para tests)
 */
/* eslint-disable no-unused-vars */

class IEnrollmentRepository {
  /**
   * Guardar un nuevo enrollment o actualizar uno existente
   *
   * @param {Enrollment} enrollment - Entidad a persistir
   * @returns {Promise<Enrollment>} Enrollment guardado (puede incluir campos adicionales del backend)
   * @throws {Error} Si falla la operación
   */
  async save(enrollment) {
    throw new Error('Method save() must be implemented');
  }

  /**
   * Buscar enrollment por su ID
   *
   * @param {EnrollmentId|string} enrollmentId - ID del enrollment
   * @returns {Promise<Enrollment|null>} Enrollment encontrado o null si no existe
   * @throws {Error} Si falla la operación
   */
  async findById(enrollmentId) {
    throw new Error('Method findById() must be implemented');
  }

  /**
   * Buscar enrollments de una competición
   *
   * Equivalente a backend: enrollment_repository.find_by_competition()
   *
   * @param {string} competitionId - UUID de la competición
   * @param {Object} filters - Filtros opcionales
   * @param {string} filters.status - Filtrar por estado (ej: "APPROVED", "REQUESTED")
   * @param {string} filters.userId - Filtrar por usuario específico
   * @param {string} filters.teamId - Filtrar por equipo específico
   * @returns {Promise<Enrollment[]>} Lista de enrollments
   * @throws {Error} Si falla la operación
   */
  async findByCompetition(competitionId, filters = {}) {
    throw new Error('Method findByCompetition() must be implemented');
  }

  /**
   * Buscar enrollment específico de un usuario en una competición
   *
   * Útil para verificar si un usuario ya está inscrito.
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} userId - UUID del usuario
   * @returns {Promise<Enrollment|null>} Enrollment encontrado o null
   * @throws {Error} Si falla la operación
   */
  async findByCompetitionAndUser(competitionId, userId) {
    throw new Error('Method findByCompetitionAndUser() must be implemented');
  }

  /**
   * Buscar enrollments de un usuario (todas sus inscripciones)
   *
   * @param {string} userId - UUID del usuario
   * @param {Object} filters - Filtros opcionales
   * @param {string} filters.status - Filtrar por estado
   * @returns {Promise<Enrollment[]>} Lista de enrollments del usuario
   * @throws {Error} Si falla la operación
   */
  async findByUser(userId, filters = {}) {
    throw new Error('Method findByUser() must be implemented');
  }

  /**
   * Solicitar inscripción (crear enrollment con estado REQUESTED)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {Object} data - Datos adicionales (opcional)
   * @returns {Promise<Enrollment>} Enrollment creado con estado REQUESTED
   * @throws {Error} Si falla la operación
   */
  async requestEnrollment(competitionId, data = {}) {
    throw new Error('Method requestEnrollment() must be implemented');
  }

  /**
   * Aprobar enrollment (transición REQUESTED/INVITED → APPROVED)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @param {string|null} teamId - ID del equipo a asignar (opcional)
   * @returns {Promise<Enrollment>} Enrollment aprobado
   * @throws {Error} Si falla la operación
   */
  async approve(competitionId, enrollmentId, teamId = null) {
    throw new Error('Method approve() must be implemented');
  }

  /**
   * Rechazar enrollment (transición REQUESTED/INVITED → REJECTED)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Enrollment>} Enrollment rechazado
   * @throws {Error} Si falla la operación
   */
  async reject(competitionId, enrollmentId) {
    throw new Error('Method reject() must be implemented');
  }

  /**
   * Cancelar enrollment (transición REQUESTED/INVITED → CANCELLED)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Enrollment>} Enrollment cancelado
   * @throws {Error} Si falla la operación
   */
  async cancel(competitionId, enrollmentId) {
    throw new Error('Method cancel() must be implemented');
  }

  /**
   * Retirar enrollment (transición APPROVED → WITHDRAWN)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Enrollment>} Enrollment retirado
   * @throws {Error} Si falla la operación
   */
  async withdraw(competitionId, enrollmentId) {
    throw new Error('Method withdraw() must be implemented');
  }

  /**
   * Establecer handicap personalizado para enrollment
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @param {number} customHandicap - Valor del handicap personalizado (-10.0 a 54.0)
   * @returns {Promise<Enrollment>} Enrollment con handicap actualizado
   * @throws {Error} Si falla la operación
   */
  async setCustomHandicap(competitionId, enrollmentId, customHandicap) {
    throw new Error('Method setCustomHandicap() must be implemented');
  }

  /**
   * Inscripción directa por el creador (sin solicitud previa)
   *
   * @param {string} competitionId - UUID de la competición
   * @param {Object} data
   * @param {string} data.userId - UUID del usuario a inscribir
   * @param {number|null} data.customHandicap - Handicap personalizado (opcional)
   * @param {string|null} data.teamId - ID del equipo (opcional)
   * @returns {Promise<Enrollment>} Enrollment creado con estado APPROVED
   * @throws {Error} Si falla la operación
   */
  async directEnroll(competitionId, data) {
    throw new Error('Method directEnroll() must be implemented');
  }

  /**
   * Eliminar enrollment (DELETE físico)
   *
   * NOTA: Usar con precaución. Normalmente se prefiere cambiar a estado final.
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<void>}
   * @throws {Error} Si falla la operación
   */
  async delete(competitionId, enrollmentId) {
    throw new Error('Method delete() must be implemented');
  }
}

export default IEnrollmentRepository;
