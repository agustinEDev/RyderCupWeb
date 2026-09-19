/**
 * Cuántos inscritos admite una competición (FE #637).
 *
 * El formulario lo pedía como obligatorio y el campo nacía vacío, así que había
 * que decidir un tope de inscritos antes de poder crear nada. Quien monta una
 * Ryder con sus amigos no tiene ninguna opinión sobre eso: ahora vive plegado
 * con el resto de valores por defecto y, si nadie lo toca, son doce.
 *
 * El tope de 100 no se comprueba aquí: lo pone la API (`max_players`, `le=100`)
 * y lo avisa la validación del formulario, para que el organizador lo lea como
 * un aviso y no como un 422.
 */
export const CUPO_POR_DEFECTO = 12;

export const cupoDeJugadores = (valor, porDefecto = CUPO_POR_DEFECTO) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isNaN(numero) ? porDefecto : numero;
};
