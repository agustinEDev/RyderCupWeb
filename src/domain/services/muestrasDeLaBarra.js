/**
 * Las barras de las muestras de hoyo (BE #532). Las muestras van por hoyo desde
 * el 17 oct (BE #575), pero cada una se manda con la barra del jugador, y las
 * suyas del móvil se ven por su barra.
 *
 * Sin género es un valor más: `null` y sin decir son lo mismo.
 */

const generoDe = (barra) => barra?.gender ?? null;

/** Si dos barras son la misma: mismo color y mismo género. */
/**
 * La barra (color y sexo) de un jugador de la anotación, con la que el mapa del
 * hoyo envía sus muestras; sin color, ninguna: solo se mide. La misma en la
 * Ryder, en stroke play y en la partida rápida (#880).
 */
export const barraDe = (jugador) => (jugador?.color ? { color: jugador.color, gender: jugador.teeGender ?? null } : null);

export const esLaMismaBarra = (a, b) => Boolean(a?.color) && a.color === b?.color && generoDe(a) === generoDe(b);
