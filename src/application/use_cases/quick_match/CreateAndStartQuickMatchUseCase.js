import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Create and start a quick match in one request (FE #848)
 *
 * The wizard keeps a local draft and only talks to the server on «Confirmar e
 * iniciar»: leaving halfway no longer leaves a pending match behind. The id
 * comes from the client, so retrying after a lost response returns the same
 * match instead of creating a second one.
 */
class CreateAndStartQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('CreateAndStartQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(peticion) {
    if (!peticion?.quickMatchId) {
      throw new Error('quickMatchId is required');
    }
    if (!peticion.golfCourseId) {
      throw new Error('golfCourseId is required');
    }
    const anotadores = peticion.scorerUserIds;
    if (!Array.isArray(anotadores) || anotadores.length < 1 || anotadores.length > 4) {
      throw new Error('scorerUserIds must contain 1 to 4 user ids');
    }

    const quickMatch = await this.#quickMatchRepository.createAndStart(peticion);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default CreateAndStartQuickMatchUseCase;
