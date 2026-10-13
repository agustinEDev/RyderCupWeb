/**
 * Una fecha sin hora (YYYY-MM-DD), como el día de una sesión, leída como ese
 * día en el huso de quien mira.
 *
 * `new Date('2026-09-26')` la toma como medianoche UTC, y por detrás de UTC
 * —toda América— se pinta el 25.
 *
 * @param {string} iso - YYYY-MM-DD
 * @returns {Date|null} null si no es una fecha sin hora
 */
export const diaDeLaSesion = (iso) => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * El día de una tarjeta, corto y sin comas: «Jue 24 sept», «Thu Sep 24»
 * (FE #845, #846). Cada idioma en su orden; con mayúscula, que abre la línea.
 *
 * @param {string} iso - YYYY-MM-DD
 * @param {string} idioma
 * @returns {string|null} null si no es una fecha sin hora
 */
export const diaCorto = (iso, idioma) => {
  const dia = diaDeLaSesion(iso);
  if (!dia) return null;
  const texto = new Intl.DateTimeFormat(idioma, { weekday: 'short', day: 'numeric', month: 'short' })
    .formatToParts(dia)
    .filter((parte) => parte.type !== 'literal')
    .map((parte) => parte.value)
    .join(' ');
  return texto.charAt(0).toLocaleUpperCase(idioma) + texto.slice(1);
};
