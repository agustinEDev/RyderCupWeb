/**
 * Lo que ve un jugador de las muestras de un campo, según su barra (BE #532,
 * marcado por par).
 *
 * Las muestras se recogen por barra (color y género): la salida de las
 * amarillas no es la de las rojas. Del resumen del campo (por hoyo, la lista
 * de barras que tienen muestras, la más antigua primero) cada hoyo queda así:
 *
 * - `primera`: la primera muestra de MI barra, o `null`.
 * - `deOtra`: la primera de cualquier otra barra (la más antigua de la lista),
 *   o `null`. Sirve de guía mientras la mía no tiene.
 * - `recoge`: si MI barra aún recoge muestras. Una barra que no está en la
 *   lista recoge; sin barra, también (no hay nada mío que esté completo).
 *
 * Sin género es un valor más: `null` y sin decir son lo mismo.
 */

const generoDe = (barra) => barra?.gender ?? null;

/** Si dos barras son la misma: mismo color y mismo género. */
export const esLaMismaBarra = (a, b) => Boolean(a?.color) && a.color === b?.color && generoDe(a) === generoDe(b);

const vacio = () => ({ primera: null, deOtra: null, recoge: true });

/**
 * @param {Object<number, {color: string, gender: string|null, primera: Object|null, recoge: boolean}[]>|null} resumen
 * @param {{color: string, gender?: string|null}|null} barra
 * @returns {Object<number, {primera: Object|null, deOtra: Object|null, recoge: boolean}>} por número de hoyo
 */
export const muestrasDeLaBarra = (resumen, barra) => {
  if (!resumen || typeof resumen !== 'object') return {};
  return Object.fromEntries(
    Object.entries(resumen).map(([hoyo, barras]) => {
      const lista = Array.isArray(barras) ? barras.filter(Boolean) : [];
      if (!lista.length) return [hoyo, vacio()];
      const mia = barra ? lista.find((otra) => esLaMismaBarra(otra, barra)) : null;
      const deOtra = lista.find((otra) => otra !== mia && otra.primera)?.primera ?? null;
      return [hoyo, { primera: mia?.primera ?? null, deOtra, recoge: mia ? mia.recoge !== false : true }];
    }),
  );
};
