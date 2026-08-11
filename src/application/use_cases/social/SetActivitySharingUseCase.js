/**
 * Use Case: Set Activity Sharing
 *
 * El jugador decide si sus logros se publican en el feed de sus amigos.
 *
 * Apagarlo no es solo dejar de publicar: el backend retira además lo ya
 * publicado, y volver a encenderlo no lo devuelve. Por eso el caso de uso
 * propaga cuántas entradas se borraron — la pantalla necesita poder decir qué
 * ha pasado, no solo que el interruptor cambió de lado.
 */
class SetActivitySharingUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('SetActivitySharingUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  /**
   * @param {boolean} enabled
   * @returns {Promise<{ shareActivity: boolean, removedEvents: number }>}
   */
  async execute(enabled) {
    if (typeof enabled !== 'boolean') {
      throw new Error('SetActivitySharingUseCase requires a boolean');
    }

    return this.#socialFeedRepository.setActivitySharing(enabled);
  }
}

export default SetActivitySharingUseCase;
