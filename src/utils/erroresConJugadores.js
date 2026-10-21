/**
 * Los errores del servidor que traen la lista de jugadores afectados en
 * `players` (sin barras, sin hándicap, sin franja). El `detail` es genérico y
 * no está traducido: el texto sale de `<prefijo>.<código>`, con la cuenta y los
 * nombres, o de `<prefijo>.<código>_unnamed` si no llega ninguno.
 */
export const CODIGOS_CON_JUGADORES = ['PLAYERS_WITHOUT_TEE', 'PLAYERS_WITHOUT_HANDICAP', 'PLAYERS_WITHOUT_TEE_WINDOW'];

/**
 * @param {Function} t
 * @param {Error} error
 * @param {string} prefijo - Dónde están los textos, p. ej. `agenda.errors`
 * @param {string[]} [codigos] - Los que tienen texto en ese prefijo
 * @returns {string|null} null si el error no es de estos: quien llama decide
 */
export const mensajeConJugadores = (t, error, prefijo, codigos = CODIGOS_CON_JUGADORES) => {
  const codigo = error?.errorCode;
  if (!codigos.includes(codigo)) return null;
  const faltan = error.data?.players || [];
  const nombres = faltan.map((p) => p.name).filter(Boolean);
  // La cuenta, la de todos, aunque alguno venga sin nombre; sin ninguno, el
  // texto sin hueco, que no quede «Faltan 0: .»
  return nombres.length > 0
    ? t(`${prefijo}.${codigo}`, { count: faltan.length, jugadores: nombres.join(', ') })
    : t(`${prefijo}.${codigo}_unnamed`);
};
