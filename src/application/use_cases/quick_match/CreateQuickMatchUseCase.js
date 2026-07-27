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

  async execute(golfCourseId, matchFormat, scoringFormat = null, name = null) {
    if (!golfCourseId || typeof golfCourseId !== 'string') {
      throw new Error('golfCourseId is required');
    }
    if ((matchFormat == null) === (scoringFormat == null)) {
      throw new Error('Exactly one of matchFormat or scoringFormat is required');
    }

    const quickMatch = await this.#quickMatchRepository.create(
      golfCourseId,
      matchFormat,
      scoringFormat,
      name
    );
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default CreateQuickMatchUseCase;
