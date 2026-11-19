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
   * @type {(options?: { limit?: number, cursor?: string|null }) => Promise<{ events: Array<any>, authors: Object, nextCursor: string|null, unseenCount: number, pendingFriendRequests: Array<any> }>}
   */
  async getFeed() {
    throw new Error('Not implemented');
  }

  /**
   * El número del botón de Actividad, sin cargar el feed: lo nuevo desde la
   * última visita (lo propio y las solicitudes de amistad incluidos), con tope
   * de 10. Es barato a propósito: se pide al abrir la aplicación y al volver.
   *
   * @returns {Promise<number>}
   */
  async getUnseenCount() {
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
   * @type {(userId: string) => Promise<Object>}
   */
  async getPlayerProfile() {
    throw new Error('Not implemented');
  }

  /**
   * La actividad publicada por un jugador. Solo entre amigos.
   *
   * @type {(userId: string, options?: { limit?: number, cursor?: string|null }) => Promise<{ events: Array<any>, nextCursor: string|null }>}
   */
  async getPlayerActivity() {
    throw new Error('Not implemented');
  }

  /**
   * Las partidas terminadas jugadas con un amigo, de la más reciente a la más
   * antigua, de 5 en 5. La primera página llega ya con el perfil. Solo entre
   * amigos: a cualquier otro, 403.
   *
   * @type {(userId: string, options?: { cursor?: string|null }) => Promise<{ games: Array<any>, nextCursor: string|null }>}
   */
  async getGamesTogether() {
    throw new Error('Not implemented');
  }

  /**
   * Enciende o apaga la publicación de los logros propios.
   *
   * Apagarlo **borra** lo ya publicado, y volver a encenderlo no lo recupera:
   * el feed se vuelve a llenar con las vueltas que se jueguen a partir de ahí.
   * Por eso devuelve cuántas entradas se retiraron, para poder decirlo.
   *
   * @type {(enabled: boolean) => Promise<{ shareActivity: boolean, removedEvents: number }>}
   */
  async setActivitySharing() {
    throw new Error('Not implemented');
  }
}

export default ISocialFeedRepository;
