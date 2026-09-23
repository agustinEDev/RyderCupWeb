/**
 * Los sobres que me faltan por entregar (FE #655).
 *
 * Alimenta «Requiere tu Atención»: sin esto un capitán solo se entera entrando
 * sesión por sesión en la agenda de cada competición, y el plazo le vence sin
 * saberlo. Quién capitanea y qué está pendiente lo decide el servidor.
 */
class ListMyPendingEnvelopesUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute() {
    return await this.envelopeRepository.listMyPendingEnvelopes();
  }
}

export default ListMyPendingEnvelopesUseCase;
