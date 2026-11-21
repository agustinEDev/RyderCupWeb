/**
 * De dónde sale la barra que juega un inscrito en un campo (barras por campo,
 * RyderCupAm `CourseTeesDTO.source`): su cambio propio en ese campo, la del
 * campo para su género, su barra general, la habitual de su género si no
 * tiene general, ninguna válida en ese campo, o la que jugó allí con la
 * competición terminada o cancelada (RyderCupAm #919).
 *
 * @readonly
 * @enum {string}
 */
export const TeeSource = Object.freeze({
  OWN: 'OWN',
  COURSE: 'COURSE',
  GENERAL: 'GENERAL',
  DEFAULT: 'DEFAULT',
  NONE: 'NONE',
  PLAYED: 'PLAYED',
});
