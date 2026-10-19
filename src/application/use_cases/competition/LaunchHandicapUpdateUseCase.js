/**
 * Lanzar la actualización de hándicaps con la RFEG (FE #824): desde el cierre,
 * dentro de su ventana. Si la última quedó incompleta, termina solo lo que falta.
 */
class LaunchHandicapUpdateUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  async execute(competitionId) {
    if (!competitionId) throw new Error('Competition ID is required');
    return this.competitionRepository.launchHandicapUpdate(competitionId);
  }
}

export default LaunchHandicapUpdateUseCase;
