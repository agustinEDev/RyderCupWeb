/**
 * El tipo de campo, que decide los rangos de par, rating y slope.
 *
 * Los valores son los del backend (modules/golf_course/domain/value_objects/course_type.py).
 *
 * @readonly
 * @enum {string}
 */
export const CourseType = Object.freeze({
  STANDARD_18: 'STANDARD_18',
  PITCH_AND_PUTT: 'PITCH_AND_PUTT',
  EXECUTIVE: 'EXECUTIVE',
});
