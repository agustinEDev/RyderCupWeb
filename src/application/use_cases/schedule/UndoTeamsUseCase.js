/**
 * Deshace los equipos formados para que pueda entrar alguien nuevo (30 oct 2026).
 *
 * Con los equipos formados no se invita ni se vuelven a formar. El servidor
 * hace el mismo reinicio que al quitar a un jugador: fuera equipos, draft,
 * sobres y subcapitanes; los capitanes se quedan y se repite el draft.
 */
class UndoTeamsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return await this.scheduleRepository.undoTeams(competitionId);
  }
}

export default UndoTeamsUseCase;
