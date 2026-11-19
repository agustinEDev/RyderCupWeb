/** @typedef {import('../../../domain/repositories/IHoleMarkingGuideStore').default} IHoleMarkingGuideStore */

/**
 * HoleMarkingGuideUseCase: si el jugador ya vio la guía para marcar un hoyo en
 * este móvil. Sin usuario no hay de quién apuntarlo: no vista, y no se guarda.
 */
class HoleMarkingGuideUseCase {
  /**
   * @param {Object} dependencies
   * @param {IHoleMarkingGuideStore} dependencies.holeMarkingGuideStore
   */
  constructor({ holeMarkingGuideStore }) {
    this.holeMarkingGuideStore = holeMarkingGuideStore;
  }

  /**
   * @param {string|null|undefined} userId
   * @returns {boolean}
   */
  yaVista(userId) {
    return Boolean(userId) && this.holeMarkingGuideStore.yaVista(userId);
  }

  /** @param {string|null|undefined} userId */
  marcarVista(userId) {
    if (userId) this.holeMarkingGuideStore.marcarVista(userId);
  }
}

export default HoleMarkingGuideUseCase;
