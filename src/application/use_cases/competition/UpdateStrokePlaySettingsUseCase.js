/**
 * Use Case: cambiar los ajustes de un Stableford o un Medal (FE #824).
 *
 * Categorías (límites a mano o N iguales), jornadas por jugador y general, por
 * su propio PATCH (RyderCupAm#251, #536). Solo se manda lo que cambia: el
 * backend entiende unos límites, aunque vacíos, como pasar a límites a mano.
 * Las reglas las valida el backend (y el formulario, antes de enviar).
 */
class UpdateStrokePlaySettingsUseCase {
  /**
   * @param {Object} deps
   * @param {import('../../../domain/repositories/ICompetitionRepository').default} deps.competitionRepository
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * @param {string} competitionId
   * @param {{categoryLimits?: number[], categoryCount?: number, maxMatchdaysPerPlayer?: number, overallStanding?: string}} cambios
   * @returns {Promise<{categoryLimits: number[], categoryCount: number|null, maxMatchdaysPerPlayer: number, overallStanding: string}>}
   */
  async execute(competitionId, cambios) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }
    const campos = Object.keys(cambios ?? {}).filter((campo) => cambios[campo] !== undefined);
    if (campos.length === 0) {
      throw new Error('There is nothing to change');
    }
    // Los dos modos de hacer categorías no van juntos: sería un 400
    if (cambios.categoryLimits !== undefined && cambios.categoryCount !== undefined) {
      throw new Error('Send either category limits or a category count, not both');
    }

    const ajustes = await this.competitionRepository.updateStrokePlay(competitionId, cambios);
    return {
      categoryLimits: [...ajustes.categoryLimits],
      categoryCount: ajustes.categoryCount,
      maxMatchdaysPerPlayer: ajustes.maxMatchdaysPerPlayer,
      overallStanding: ajustes.overallStanding,
    };
  }
}

export default UpdateStrokePlaySettingsUseCase;
