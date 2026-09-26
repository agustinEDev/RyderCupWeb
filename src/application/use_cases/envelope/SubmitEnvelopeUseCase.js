/**
 * Entrega —o corrige— el sobre del capitán (FE #655).
 *
 * El equipo no se manda: lo decide el servidor por quién firma la petición.
 *
 * `revealWhenBothReady` pide abrirlos en cuanto estén los dos, sin esperar a la
 * hora. Hacen falta los DOS capitanes: con uno solo se espera.
 */
class SubmitEnvelopeUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute(roundId, entries, revealWhenBothReady = false) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    if (!entries || entries.length === 0) {
      // El servidor lo rechaza, y el capitán vería un error sin entender por qué
      throw new Error('Entries are required');
    }
    return await this.envelopeRepository.submitEnvelope(roundId, entries, revealWhenBothReady);
  }
}

export default SubmitEnvelopeUseCase;
