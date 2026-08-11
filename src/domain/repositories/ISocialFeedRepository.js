/**
 * ISocialFeedRepository - Puerto del feed de actividad y los perfiles.
 *
 * El feed muestra los logros propios y los de los amigos. Lo que hay detrás de
 * una amistad (estadísticas, actividad, fotos) solo se ve entre amigos; la
 * ficha mínima de cualquiera —nombre, apellidos, foto— la ve todo el mundo.
 */
class ISocialFeedRepository {
  /**
   * Una página del feed, de lo más reciente a lo más antiguo.
   *
   * Se pagina por cursor y no por número de página porque el feed crece por
   * arriba: con un desplazamiento numérico se repetirían entradas cada vez que
   * alguien publica algo mientras se navega.
   *
   * @param {{ limit?: number, cursor?: string|null }} options
   * @returns {Promise<{ events: Array, authors: Object, nextCursor: string|null, unseenCount: number }>}
   */
  async getFeed() {
    throw new Error('Not implemented');
  }

  /**
   * Da el feed por visto y apaga el aviso de novedades.
   *
   * Es una llamada aparte y no un efecto de cargar el feed: el cliente también
   * lo pide para refrescar en segundo plano, y eso no debe apagar el aviso.
   *
   * @returns {Promise<void>}
   */
  async markFeedAsSeen() {
    throw new Error('Not implemented');
  }

  /**
   * El perfil de un jugador. Siempre devuelve la ficha mínima; los campos
   * privados llegan en null si no sois amigos.
   *
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getPlayerProfile() {
    throw new Error('Not implemented');
  }

  /**
   * La actividad publicada por un jugador. Solo entre amigos.
   *
   * @param {string} userId
   * @param {{ limit?: number, cursor?: string|null }} options
   * @returns {Promise<{ events: Array, nextCursor: string|null }>}
   */
  async getPlayerActivity() {
    throw new Error('Not implemented');
  }
}

export default ISocialFeedRepository;
