/**
 * Use Case: Get Games Together
 *
 * Las partidas terminadas que has jugado con un amigo, de la más reciente a la
 * más antigua, de 5 en 5. La primera página ya llega con el perfil; esto pide
 * las siguientes. Solo entre amigos: el backend responde 403 a cualquier otro.
 */
class GetGamesTogetherUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('GetGamesTogetherUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute(userId, { cursor = null } = {}) {
    if (!userId) {
      throw new Error('GetGamesTogetherUseCase requires a userId');
    }
    return this.#socialFeedRepository.getGamesTogether(userId, { cursor });
  }
}

export default GetGamesTogetherUseCase;
