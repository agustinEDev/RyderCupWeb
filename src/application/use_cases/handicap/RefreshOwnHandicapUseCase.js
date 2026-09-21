/**
 * Refresca el hándicap del usuario autenticado (FE #677).
 *
 * El login lo hacía antes de contestar, esperando a la RFEG (RyderCupAM#340).
 * Ahora lo pide el panel después de entrar, en segundo plano. Las reglas —una
 * vez al día, solo España— las aplica el servidor.
 */
class RefreshOwnHandicapUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../../domain/repositories/IHandicapRepository').default} dependencies.handicapRepository
   */
  constructor({ handicapRepository }) {
    this.handicapRepository = handicapRepository;
  }

  /**
   * @returns {Promise<{needsHandicap: boolean, handicap: number|null}>}
   */
  async execute() {
    return this.handicapRepository.refreshMine();
  }
}

export default RefreshOwnHandicapUseCase;
