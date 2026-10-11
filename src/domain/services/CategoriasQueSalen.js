/**
 * Cuántas categorías salen de las pedidas en un Stableford o un Medal, y por
 * qué salen menos (FE #824, PR 8, caso 9; reglas de la BE #536, decididas el
 * 10 oct 2026):
 *
 *   - Pedidas: N «categorías iguales», o los límites a mano + 1.
 *   - Al cerrar, las iguales se reparten en min(N, n // 6), y los límites
 *     que salen repetidos se funden: eso son hándicaps repetidos.
 *   - Después, la regla de los seis funde las que se quedan con menos de
 *     seis jugadores (también con límites a mano): lo dice la categoría más
 *     alta que tienen los inscritos.
 *
 * Mientras los inscritos no tienen categoría (antes de cerrar) no hay nada que
 * comparar.
 */
export const REPETIDOS = 'REPETIDOS';
export const MENOS_DE_SEIS = 'MENOS_DE_SEIS';
const POR_CATEGORIA = 6;

/**
 * @param {{categoryCount: number|null, categoryLimits: number[]}} ajustes - Los del torneo
 * @param {Array<number|null>} categoriasDeLosInscritos - La de cada aprobado
 * @returns {{pedidas: number, salen: number, motivo: string}|null}
 */
export const categoriasQueSalen = ({ categoryCount, categoryLimits }, categoriasDeLosInscritos) => {
  const limites = categoryLimits?.length ?? 0;
  const pedidas = categoryCount ?? (limites > 0 ? limites + 1 : 0);
  const asignadas = categoriasDeLosInscritos.filter((c) => c != null);
  if (pedidas <= 1 || asignadas.length === 0) return null;

  const salen = Math.max(...asignadas);
  if (salen >= pedidas) return null;

  // En «iguales», los límites que se guardaron al repartir: si son menos de
  // los que daban los jugadores, es que se fundieron por hándicaps repetidos
  const porLimites = limites + 1;
  // n son los que se repartieron: los que tienen categoría (el backend solo
  // reparte a quien tiene hándicap; /code-review)
  const cabian = categoryCount != null ? Math.min(categoryCount, Math.floor(asignadas.length / POR_CATEGORIA)) : pedidas;
  // Si además la regla de los seis fundió más, lo último que pasó es eso
  const motivo = porLimites < cabian && salen === porLimites ? REPETIDOS : MENOS_DE_SEIS;
  return { pedidas, salen, motivo };
};
