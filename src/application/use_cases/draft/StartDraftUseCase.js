/**
 * Lanza el sorteo y abre la sala de draft (FE #653).
 *
 * Solo el organizador: el backend lo comprueba y responde 403.
 */
class StartDraftUseCase {
  constructor({ draftRepository }) {
    this.draftRepository = draftRepository;
  }

  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return await this.draftRepository.startDraft(competitionId);
  }
}

export default StartDraftUseCase;
