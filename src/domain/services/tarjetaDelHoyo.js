/**
 * Lo que dicen las barras de un hoyo, en una línea, para el admin que lo revisa
 * (Agustín, 17 oct): «Par 5 · Distancia del hoyo: 430 a 500 m», de la barra más
 * corta a la más larga. Si el par cambia entre barras, los dos («Par 4–5»), y
 * los codos de la línea salen con el par de la barra más larga.
 *
 * Una barra sin par no cuenta para el par, y una sin metros, para los metros.
 *
 * @param {{par: number|null, metros: number|null}[]} barras
 * @returns {{parMinimo: number, parMaximo: number, metrosMinimo: number|null,
 *   metrosMaximo: number|null, parDeLaMasLarga: number}|null} null sin ningún par
 */
export const tarjetaDelHoyo = (barras) => {
  const conPar = (barras ?? []).filter((b) => Number.isFinite(b.par));
  if (!conPar.length) return null;
  const pares = conPar.map((b) => b.par);
  const metros = (barras ?? []).map((b) => b.metros).filter(Number.isFinite);
  const conParYMetros = conPar.filter((b) => Number.isFinite(b.metros));
  const masLarga = conParYMetros.reduce((larga, b) => (larga === null || b.metros > larga.metros ? b : larga), null);
  return {
    parMinimo: Math.min(...pares),
    parMaximo: Math.max(...pares),
    metrosMinimo: metros.length ? Math.min(...metros) : null,
    metrosMaximo: metros.length ? Math.max(...metros) : null,
    // Sin metros no se sabe cuál es la más larga: el par mayor
    parDeLaMasLarga: masLarga ? masLarga.par : Math.max(...pares),
  };
};
