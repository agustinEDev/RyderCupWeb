/**
 * Abre los dos sobres de una sesión (FE #655).
 *
 * Un capitán solo puede si el rival ya entregó; el organizador, siempre. Eso
 * lo decide el servidor: aquí se deja pasar y se enseña lo que responda.
 */
class RevealEnvelopesUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute(roundId) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    return await this.envelopeRepository.revealEnvelopes(roundId);
  }
}

export default RevealEnvelopesUseCase;
