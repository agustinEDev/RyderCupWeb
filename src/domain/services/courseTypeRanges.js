/**
 * Los mismos rangos que valida `GolfCourse` en el backend, por tipo de campo
 * (`golf_course/domain/entities/golf_course.py`). Un pitch & putt es par ~54 y
 * su CR/SR no viven en la escala de un 18 hoyos: con un rango unico sus barras
 * se rechazaban, y sus jugadores acababan jugando con el indice bruto en vez de
 * con el handicap de juego. Ver RyderCupAm#206.
 *
 * El techo de slope de los campos estandar sube a 160 pese a que WHS define 155
 * como maximo: hay campos federados publicados por encima (el Villa de Madrid,
 * negras de mujeres, esta en 157). El suelo si se mantiene estricto, porque es
 * lo que permite detectar erratas de origen.
 *
 * Viven aqui, y no en el formulario, porque el par total se valida en CUATRO
 * sitios mas: los tres casos de uso de alta, peticion y actualizacion, y el
 * aviso en pantalla. Mientras el rango estuvo copiado a mano en cada uno, el
 * formulario aceptaba un par 54 que el caso de uso rechazaba justo despues.
 */

export const DEFAULT_COURSE_TYPE = 'STANDARD_18';

export const COURSE_TYPES = ['STANDARD_18', 'PITCH_AND_PUTT', 'EXECUTIVE'];

export const PAR_RANGE_BY_COURSE_TYPE = {
  STANDARD_18: [66, 76],
  PITCH_AND_PUTT: [54, 60],
  EXECUTIVE: [61, 65],
};

export const RATING_RANGE_BY_COURSE_TYPE = {
  STANDARD_18: [50, 90],
  PITCH_AND_PUTT: [45, 90],
  EXECUTIVE: [45, 90],
};

export const SLOPE_RANGE_BY_COURSE_TYPE = {
  STANDARD_18: [55, 160],
  PITCH_AND_PUTT: [40, 155],
  EXECUTIVE: [40, 155],
};

// Un tipo desconocido —o ausente, que es lo que llega desde los formularios mas
// viejos— se trata como campo estandar, que es lo que el backend asume tambien.
// Ojo: eso NO equivale a "lo mas estricto". Lo es para el par y para el CR,
// pero no para el slope: el techo de un campo estandar es 160 y el de uno corto
// 155, asi que un slope de 158 sin tipo pasa. Se acepta porque el caso real es
// un campo largo antiguo sin `courseType`, no un pitch & putt disfrazado.
const rangeFor = (table) => (courseType) => table[courseType] ?? table[DEFAULT_COURSE_TYPE];

export const parRangeFor = rangeFor(PAR_RANGE_BY_COURSE_TYPE);
export const ratingRangeFor = rangeFor(RATING_RANGE_BY_COURSE_TYPE);
export const slopeRangeFor = rangeFor(SLOPE_RANGE_BY_COURSE_TYPE);

export const isTotalParValid = (totalPar, courseType) => {
  const [min, max] = parRangeFor(courseType);
  return totalPar >= min && totalPar <= max;
};
