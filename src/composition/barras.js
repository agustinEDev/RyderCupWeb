import ApiBarrasRepository from '../infrastructure/repositories/ApiBarrasRepository';
import ChangeEnrollmentTeeUseCase from '../application/use_cases/barras/ChangeEnrollmentTeeUseCase';
import GetEnrollmentTeesUseCase from '../application/use_cases/barras/GetEnrollmentTeesUseCase';
import ChangeEnrollmentCourseTeeUseCase from '../application/use_cases/barras/ChangeEnrollmentCourseTeeUseCase';
import SetCompetitionCourseTeeUseCase from '../application/use_cases/barras/SetCompetitionCourseTeeUseCase';

/**
 * Los casos de uso de las barras (RyderCupAm#912 y barras por campo), en un
 * trozo aparte: se cargan con `import()` al abrir una ficha o un selector, no
 * al arrancar (el arranque va justo de presupuesto, #374).
 */
const barrasRepository = new ApiBarrasRepository();

export const changeEnrollmentTeeUseCase = new ChangeEnrollmentTeeUseCase(
  barrasRepository,
);
export const getEnrollmentTeesUseCase = new GetEnrollmentTeesUseCase(
  barrasRepository,
);
export const changeEnrollmentCourseTeeUseCase =
  new ChangeEnrollmentCourseTeeUseCase(barrasRepository);
export const setCompetitionCourseTeeUseCase =
  new SetCompetitionCourseTeeUseCase(barrasRepository);
