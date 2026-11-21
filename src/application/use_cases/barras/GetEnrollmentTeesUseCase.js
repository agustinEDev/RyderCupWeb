import { exigeTexto } from './validacion';

/** @typedef {import('../../../domain/repositories/IBarrasRepository').default} IBarrasRepository */

/**
 * Use Case: las barras de una inscripción, campo a campo (barras por campo).
 * La general, la habitual de su género y, por campo, la que juega, de dónde
 * sale (OWN, COURSE, GENERAL, DEFAULT o NONE) y las que se le pueden fijar.
 * La lee el propio jugador, su capitán, el organizador o un admin.
 */
class GetEnrollmentTeesUseCase {
  #barrasRepository;

  /** @param {IBarrasRepository} barrasRepository */
  constructor(barrasRepository) {
    if (!barrasRepository)
      throw new Error('GetEnrollmentTeesUseCase requires barrasRepository');
    this.#barrasRepository = barrasRepository;
  }

  /** @param {string} enrollmentId */
  async execute(enrollmentId) {
    exigeTexto(enrollmentId, 'enrollmentId');
    return this.#barrasRepository.getTees(enrollmentId);
  }
}

export default GetEnrollmentTeesUseCase;
