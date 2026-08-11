/**
 * Use Case: Get Friends Feed
 *
 * Recupera una página del feed de actividad. El aviso de novedades viene en la
 * misma respuesta, así que no hace falta una segunda llamada para saber si hay
 * algo nuevo.
 */
class GetFriendsFeedUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('GetFriendsFeedUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute({ limit = 20, cursor = null } = {}) {
    return this.#socialFeedRepository.getFeed({ limit, cursor });
  }
}

export default GetFriendsFeedUseCase;
