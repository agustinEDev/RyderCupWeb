/**
 * La sala de draft tal como está (FE #653).
 *
 * Devuelve null cuando todavía no se ha lanzado el sorteo. Mirarla es además
 * lo que resuelve en el servidor los turnos que se hayan agotado.
 */
class GetDraftUseCase {
  constructor({ draftRepository }) {
    this.draftRepository = draftRepository;
  }

  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return await this.draftRepository.getDraft(competitionId);
  }
}

export default GetDraftUseCase;
