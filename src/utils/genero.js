/**
 * Las opciones de `t()` con el contexto femenino si toca: «Retirada», «No
 * presentada», «1.ª en espera». Una sola regla para todas las pantallas
 * (/code-review, 12 oct 2026). Sin opciones y sin género, `undefined`.
 *
 * @param {string|null|undefined} genero - 'FEMALE' | 'MALE' | null
 * @param {Object} [opciones]
 * @returns {Object|undefined}
 */
export const conGenero = (genero, opciones) =>
  genero === 'FEMALE' ? { ...opciones, context: 'female' } : opciones;
