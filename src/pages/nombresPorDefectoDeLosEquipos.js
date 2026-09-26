/**
 * Cómo se llaman los equipos mientras el organizador no diga otra cosa.
 *
 * Visto en el Kind el 23 sep: una competición creada con la app en español
 * enseñaba «Equipo 1: Europe» y «Capitán de Europe». El formulario dejaba
 * puestos los nombres en inglés y así se guardaban.
 *
 * No se traducen al pintar, y es a propósito: son **texto libre** del
 * organizador, no etiquetas. A quien llame a su equipo «USA» queriendo, la
 * pantalla no puede cambiarle el nombre. Así que nacen en el idioma de la app
 * y a partir de ahí mandan ellos.
 *
 * @param {Function} t
 * @returns {{uno: string, dos: string}}
 */
export const nombresPorDefectoDeLosEquipos = (t) => ({
  uno: t('create.defaultTeamOne', { defaultValue: 'Europe' }),
  dos: t('create.defaultTeamTwo', { defaultValue: 'USA' }),
});
