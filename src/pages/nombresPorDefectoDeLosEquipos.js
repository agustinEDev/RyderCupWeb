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

/**
 * Todos los nombres con los que un equipo puede haber nacido, en cualquier
 * idioma y contando el respaldo en inglés.
 *
 * Los namespaces se cargan con `import()` y sin suspense, así que la primera
 * renderización puede llegar con `t` sin resolver: el nombre nace entonces con
 * su respaldo en inglés y, como es el valor inicial de `useState`, se queda
 * congelado ahí aunque la app esté en español.
 */
const LOS_DE_NACIMIENTO = new Set([
  'Europe',
  'USA',
  'Europa',
  'Estados Unidos',
]);

/**
 * Si los nombres siguen siendo los que puso la aplicación, o sea, si el
 * organizador todavía no ha escrito los suyos. Solo entonces se pueden
 * cambiar por debajo cuando el idioma acabe de cargar.
 *
 * @param {{uno: string, dos: string}} nombres
 * @returns {boolean}
 */
export const siguenSiendoLosDePorDefecto = ({ uno, dos }) =>
  LOS_DE_NACIMIENTO.has(uno) && LOS_DE_NACIMIENTO.has(dos);
