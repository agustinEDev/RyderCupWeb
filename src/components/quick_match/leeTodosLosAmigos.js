import { listFriendsUseCase } from '../../composition';

const AMIGOS_POR_PAGINA = 100;

/**
 * La lista de amigos entera, página a página: la del asistente de partida
 * rápida y la de repetir una (FE #1021).
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const leeTodosLosAmigos = async (userId) => {
  const amigos = [];
  for (let page = 1; ; page += 1) {
    const { friendships, totalCount } = await listFriendsUseCase.execute(userId, {
      limit: AMIGOS_POR_PAGINA,
      page,
    });
    amigos.push(...friendships);
    // Ya están todos; o una página vacía, por si el total no cuadra: sin
    // eso, un total mal contado pediría páginas para siempre
    if (amigos.length >= totalCount || friendships.length === 0) return amigos;
  }
};
