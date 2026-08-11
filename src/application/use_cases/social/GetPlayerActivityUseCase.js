/**
 * Use Case: Get Player Activity
 *
 * Los logros que un jugador ha publicado. Solo entre amigos: el backend
 * responde 403 a quien no lo sea, que es distinto del 404 del perfil — la
 * existencia del jugador ya es pública, lo que no lo es son sus vueltas.
 *
 * Una lista vacía no es un error: significa que no publica nada.
 */
class GetPlayerActivityUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('GetPlayerActivityUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute(userId, { limit = 20, cursor = null } = {}) {
    if (!userId) {
      throw new Error('GetPlayerActivityUseCase requires a userId');
    }
    return this.#socialFeedRepository.getPlayerActivity(userId, { limit, cursor });
  }
}

export default GetPlayerActivityUseCase;
