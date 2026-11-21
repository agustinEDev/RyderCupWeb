/**
 * Las barras de las inscripciones de una competición (RyderCupAm#912 y barras
 * por campo, 20 nov 2026): la general de cada jugador, la suya en cada campo y
 * la de un campo para un género. Quién puede y hasta cuándo lo decide el
 * backend; los rechazos salen con `status` y `errorCode`.
 *
 * @interface
 */
class IBarrasRepository {
  /**
   * Su barra general: PUT /enrollments/{id}/tee
   *
   * @param {string} enrollmentId
   * @param {string|null} teeColor - null vuelve a la habitual de su género
   * @returns {Promise<{id: string, teeColor: string|null}>}
   */
  async changeTee(enrollmentId, teeColor) {
    throw new Error('Method changeTee() must be implemented');
  }

  /**
   * Las de una inscripción, campo a campo: GET /enrollments/{id}/tees
   *
   * @param {string} enrollmentId
   * @returns {Promise<{generalTee: string|null, defaultTee: string|null, courses: Array<{golfCourseId: string, golfCourseName: string, tee: string|null, source: string, options: string[]}>}>}
   */
  async getTees(enrollmentId) {
    throw new Error('Method getTees() must be implemented');
  }

  /**
   * Su barra en un campo: PUT /enrollments/{id}/courses/{golfCourseId}/tee
   *
   * @param {string} enrollmentId
   * @param {string} golfCourseId
   * @param {string|null} teeColor - null quita su cambio en ese campo
   * @returns {Promise<{teeColor: string|null}>}
   */
  async changeCourseTee(enrollmentId, golfCourseId, teeColor) {
    throw new Error('Method changeCourseTee() must be implemented');
  }

  /**
   * La de un campo para todos los de un género (organizador o admin):
   * PUT /competitions/{id}/courses/{golfCourseId}/tee
   *
   * @param {string} competitionId
   * @param {string} golfCourseId
   * @param {string} gender
   * @param {string|null} teeColor - null la quita
   * @returns {Promise<{gender: string, teeColor: string|null}>}
   */
  async setCourseTee(competitionId, golfCourseId, gender, teeColor) {
    throw new Error('Method setCourseTee() must be implemented');
  }
}

export default IBarrasRepository;
