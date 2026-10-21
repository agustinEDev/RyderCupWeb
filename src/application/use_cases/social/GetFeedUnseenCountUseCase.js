/**
 * Use Case: Get Feed Unseen Count
 *
 * El número del botón de Actividad sin cargar el feed (FE-1). Se pide al
 * abrir la aplicación y al volver a ella; si falla, quien llama se queda con
 * el último número que tuviera.
 */
class GetFeedUnseenCountUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('GetFeedUnseenCountUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute() {
    return this.#socialFeedRepository.getUnseenCount();
  }
}

export default GetFeedUnseenCountUseCase;
