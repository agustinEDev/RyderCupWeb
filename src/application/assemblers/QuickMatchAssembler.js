import QuickMatch from '../../domain/entities/QuickMatch';

/**
 * QuickMatchAssembler - Application Layer
 *
 * Converts QuickMatch domain entities to simple DTOs for the UI.
 */
class QuickMatchAssembler {
  /**
   * Converts a domain entity to a simple DTO for the UI.
   *
   * @param {QuickMatch} quickMatch - Domain entity
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(quickMatch) {
    if (!(quickMatch instanceof QuickMatch)) {
      throw new Error('QuickMatchAssembler.toSimpleDTO: quickMatch must be a QuickMatch instance');
    }

    return {
      id: quickMatch.id,
      creatorId: quickMatch.creatorId,
      golfCourseId: quickMatch.golfCourseId,
      matchFormat: quickMatch.matchFormat,
      scoringFormat: quickMatch.scoringFormat,
      status: quickMatch.status.toString(),
      name: quickMatch.name,
      participants: quickMatch.participants,
      scorerIds: quickMatch.scorerIds,
      holeScores: quickMatch.holeScores,
      standing: quickMatch.standing,
      scoringAssignments: quickMatch.scoringAssignments,
      createdAt: quickMatch.createdAt.toISOString(),
      updatedAt: quickMatch.updatedAt.toISOString(),

      // Computed fields
      isPending: quickMatch.isPending(),
      isInProgress: quickMatch.isInProgress(),
      isCompleted: quickMatch.isCompleted(),
      isCancelled: quickMatch.isCancelled(),
    };
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<QuickMatch>} quickMatches - Array of domain entities
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(quickMatches) {
    if (!Array.isArray(quickMatches)) {
      throw new Error('QuickMatchAssembler.toSimpleDTOMany: quickMatches must be an array');
    }

    return quickMatches.map((quickMatch) => QuickMatchAssembler.toSimpleDTO(quickMatch));
  }
}

export default QuickMatchAssembler;
