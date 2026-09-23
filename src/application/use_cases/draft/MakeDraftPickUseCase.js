/**
 * Elige a un jugador para el equipo de turno (FE #653).
 *
 * Si el minuto ya se había agotado, el servidor responde 409: la aplicación
 * eligió por el capitán y el turno ya es del otro.
 */
class MakeDraftPickUseCase {
  constructor({ draftRepository }) {
    this.draftRepository = draftRepository;
  }

  async execute(competitionId, playerId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    if (!playerId) {
      throw new Error('Player ID is required');
    }
    return await this.draftRepository.makePick(competitionId, playerId);
  }
}

export default MakeDraftPickUseCase;
