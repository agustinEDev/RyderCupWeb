/**
 * Rehace los sobres de una sesión (FE #655).
 *
 * Tira los dos sobres y los partidos de esa sesión para que los capitanes
 * vuelvan a entregar. Lo pide solo el organizador y solo mientras no se haya
 * jugado nada: eso lo decide el servidor, aquí se deja pasar y se enseña lo
 * que responda.
 */
class ResetEnvelopesUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute(roundId) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    return await this.envelopeRepository.resetEnvelopes(roundId);
  }
}

export default ResetEnvelopesUseCase;
