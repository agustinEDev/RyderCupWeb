/**
 * Lo que puede ver quien pregunta por los sobres de una sesión (FE #655).
 *
 * Devuelve null cuando esa sesión no tiene sobres.
 */
class GetEnvelopesUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute(roundId) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    return await this.envelopeRepository.getEnvelopes(roundId);
  }
}

export default GetEnvelopesUseCase;
