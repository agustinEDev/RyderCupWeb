const SUFIJO_DE_GENERO = { MALE: ' (M)', FEMALE: ' (F)' };

/**
 * El nombre de una barra, igual en todas las pantallas (4 nov 2026): su nombre
 * propio si lo tiene («Campeonato») o su color traducido, y el género detrás,
 * «(M)» o «(F)», cuando se pasa. Sin traducción para un color, el color tal
 * cual.
 *
 * @param {Function} t La `t` del espacio `golfCourses`
 * @param {{color: string, identifier?: string, gender?: 'MALE'|'FEMALE'|null}} barra
 * @returns {string}
 */
export const nombreDeLaBarra = (t, { color, identifier, gender }) =>
  (identifier || t(`form.teeColors.${color}`, { defaultValue: color })) + (SUFIJO_DE_GENERO[gender] ?? '');
