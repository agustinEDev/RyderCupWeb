import EnrollmentAssembler from '../../assemblers/EnrollmentAssembler';

/**
 * Use Case: Set Name Preference (FE #571, backend en BE #254)
 *
 * El jugador elige si UNA competición le muestra su alias o su nombre legal.
 *
 * Quien decide es el dueño de la inscripción, no quien organiza —al revés que
 * el hándicap personalizado—, y puede cambiarlo en cualquier momento, con el
 * torneo en marcha incluido. El backend valida la propiedad y responde 403 a
 * cualquier otro.
 *
 * No hay `competitionId` en la firma porque el endpoint no lo pide: la
 * inscripción ya sabe a qué competición pertenece.
 *
 * CUIDADO con el DTO que devuelve: el endpoint responde con la inscripción a
 * medias —id, competición, usuario, estado, preferencia y fecha—, así que el
 * equipo, el hándicap personalizado y el color salen a null aunque los tenga, y
 * `createdAt` es de mentira. Fiarse solo de `useRealName` y `status`; para lo
 * demás, volver a pedir la lista.
 *
 * @example
 * const useCase = new SetNamePreferenceUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('enroll-456', true);
 * console.log(enrollment.useRealName); // true
 */
class SetNamePreferenceUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('SetNamePreferenceUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} enrollmentId - UUID del enrollment
   * @param {boolean} useRealName - true: nombre legal; false: alias
   * @returns {Promise<Object>} DTO simple del enrollment actualizado
   * @throws {Error} Si falla la operación o la entrada es inválida
   */
  async execute(enrollmentId, useRealName) {
    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }

    // Un `undefined` colado aquí llegaría a la API como ausencia de campo y el
    // backend devolvería un 422 sin decir qué falta
    if (typeof useRealName !== 'boolean') {
      throw new Error('useRealName debe ser un booleano');
    }

    const enrollment = await this.#enrollmentRepository.setNamePreference(
      enrollmentId,
      useRealName
    );

    return EnrollmentAssembler.toSimpleDTO(enrollment);
  }
}

export default SetNamePreferenceUseCase;
