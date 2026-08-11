/**
 * Use Case: Mark Feed As Seen
 *
 * Apaga el aviso de novedades. Se llama al abrir el feed, no al cargarlo: la
 * aplicación también lo pide para refrescar en segundo plano, y eso no debería
 * dar por visto lo que nadie ha mirado.
 */
class MarkFeedAsSeenUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('MarkFeedAsSeenUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute() {
    return this.#socialFeedRepository.markFeedAsSeen();
  }
}

export default MarkFeedAsSeenUseCase;
