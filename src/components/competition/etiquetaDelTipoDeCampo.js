/**
 * Cómo se llama un tipo de campo, en el idioma de la aplicación.
 *
 * Visto en el Kind el 23 sep: la ficha de una competición en español enseñaba
 * «18 Holes» y «Executive». Estaban escritos a mano en inglés dentro del
 * componente, así que ningún idioma los tocaba.
 *
 * @param {string|null} courseType
 * @param {Function} t
 * @returns {string} El nombre, o el propio valor si nadie lo ha traducido
 */
export const etiquetaDelTipoDeCampo = (courseType, t) => {
  if (!courseType) return '';
  return t(`detail.golfCourses.types.${courseType}`, { defaultValue: courseType });
};
