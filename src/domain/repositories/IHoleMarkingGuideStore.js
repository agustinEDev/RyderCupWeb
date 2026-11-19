/**
 * Si cada jugador ya vio la guía «Marca este hoyo» en este móvil: se recuerda
 * por usuario, para que otro que entre en el mismo móvil también la vea.
 */
class IHoleMarkingGuideStore {
  /**
   * @param {string} userId
   * @returns {boolean}
   */
  yaVista(userId) {
    throw new Error('Method not implemented: yaVista');
  }

  /** @param {string} userId */
  marcarVista(userId) {
    throw new Error('Method not implemented: marcarVista');
  }
}

export default IHoleMarkingGuideStore;
