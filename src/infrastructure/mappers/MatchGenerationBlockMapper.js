/**
 * El motivo por el que una sesión con los sobres abiertos no tiene partidos
 * (BE #361), de la API a la pantalla.
 *
 * Llega en claves —`reason`, `missing`, `tee_color`— y la pantalla las pone en
 * su idioma. Vive aparte porque lo usan tres sitios —la sesión del calendario,
 * la vista del sobre y el aviso del panel— y un campo nuevo que se queda en
 * uno de ellos es el defecto que más se repite.
 *
 * @param {Object|null|undefined} apiBloqueo - `match_generation_block` de la API
 * @returns {{reason: string, players: Array}|null} null si no hay nada que avisar,
 *   también con un servidor anterior que no lo manda
 */
export const aBloqueoDePartidos = (apiBloqueo) => {
  if (!apiBloqueo) return null;
  return {
    reason: apiBloqueo.reason,
    players: (apiBloqueo.players || []).map((jugador) => ({
      userId: jugador.user_id,
      name: jugador.name,
      missing: jugador.missing,
      teeColor: jugador.tee_color ?? null,
    })),
  };
};
