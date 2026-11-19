/**
 * Cuándo abren las inscripciones de una competición programada (FE #666).
 *
 * El backend guarda «cuántos días antes» y deriva el instante en cada lectura
 * (RyderCupAM#332), así que la app puede calcular la fecha ella sola: es
 * `start_date − N`, sin pedir nada y sin husos horarios de por medio. La zona
 * solo importa para decidir si YA abrió, y eso lo decide el servidor.
 */

// Dos desde el 15 nov 2026 (RyderCupAm #865): con uno abría a las 0:00 del día
// anterior y cerraba a las 12:00 de ese mismo día, por el plazo de inscripción
export const MIN_DIAS_DE_APERTURA = 2;
export const MAX_DIAS_DE_APERTURA = 14;

/**
 * Cuántos días faltan para que empiece el torneo, contando desde hoy.
 *
 * Sirve para avisar de que una apertura «14 días antes» de un torneo que
 * empieza pasado mañana ya pasó, y la competición se abrirá al crearla. No es
 * un error —una fecha pasada significa «ábrela ya»—, pero el organizador pidió
 * una cosa y ocurre otra más pronto.
 *
 * @param {string} startDate Fecha de inicio en formato YYYY-MM-DD
 * @returns {number|null} Días que faltan, o `null` si no hay fecha válida
 */
export const diasHastaElTorneo = (startDate) => {
  if (!startDate) return null;

  const comienzo = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(comienzo.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const MILISEGUNDOS_POR_DIA = 86400000;
  // Restar dos Date resta sus milisegundos (valueOf); los `any` son solo para
  // el tipado, que solo deja restar números. Sin formatear: Prettier saca el
  // primer cast del paréntesis y pasaría a envolver la resta entera
  // prettier-ignore
  return Math.round(
    (/** @type {any} */ (comienzo) - /** @type {any} */ (hoy)) / MILISEGUNDOS_POR_DIA,
  );
};

/**
 * La fecha en que abrirán las inscripciones, o `null` si no se puede saber.
 *
 * @param {string} startDate Fecha de inicio del torneo (YYYY-MM-DD)
 * @param {number|null} diasAntes Días de antelación, o `null` si no hay
 */
export const fechaDeApertura = (startDate, diasAntes) => {
  if (!startDate || diasAntes == null) return null;

  const comienzo = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(comienzo.getTime())) return null;

  comienzo.setDate(comienzo.getDate() - diasAntes);
  return comienzo;
};
