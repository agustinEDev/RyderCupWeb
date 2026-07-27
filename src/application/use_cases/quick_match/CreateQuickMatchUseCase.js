import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Create Quick Match
 *
 * Creates a quick match with the current user as creator/first participant.
 */
class CreateQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('CreateQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(golfCourseId, matchFormat, name = null) {
    if (!golfCourseId || typeof golfCourseId !== 'string') {
      throw new Error('golfCourseId is required');
    }
    if (!matchFormat || typeof matchFormat !== 'string') {
      throw new Error('matchFormat is required');
    }

    const quickMatch = await this.#quickMatchRepository.create(golfCourseId, matchFormat, name);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default CreateQuickMatchUseCase;
