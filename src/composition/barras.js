import ApiBarrasRepository from '../infrastructure/repositories/ApiBarrasRepository';
import ChangeEnrollmentTeeUseCase from '../application/use_cases/barras/ChangeEnrollmentTeeUseCase';
import GetEnrollmentTeesUseCase from '../application/use_cases/barras/GetEnrollmentTeesUseCase';
import ChangeEnrollmentCourseTeeUseCase from '../application/use_cases/barras/ChangeEnrollmentCourseTeeUseCase';
import SetCompetitionCourseTeeUseCase from '../application/use_cases/barras/SetCompetitionCourseTeeUseCase';
import GetCompetitionCourseTeesUseCase from '../application/use_cases/barras/GetCompetitionCourseTeesUseCase';

/**
 * Los casos de uso de las barras (RyderCupAm#912 y barras por campo), aparte
 * de la composition root del arranque: solo los importan pantallas que ya se
 * cargan aparte (la ficha, explorar, las invitaciones), por `cargarBarras`, así
 * que no pesan en el arranque (#374).
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
export const getCompetitionCourseTeesUseCase =
  new GetCompetitionCourseTeesUseCase(barrasRepository);
