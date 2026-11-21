import IBarrasRepository from '../../domain/repositories/IBarrasRepository';
import apiRequest, { segmento } from '../http/api.js';

const aCampo = (campo) => ({
  golfCourseId: campo.golf_course_id,
  golfCourseName: campo.golf_course_name ?? '',
  tee: campo.tee ?? null,
  source: campo.source,
  options: campo.options ?? [],
});

/**
 * Las barras de las inscripciones contra la API (RyderCupAm#912 y barras por
 * campo). Aparte del repositorio de inscripciones para que vaya en un trozo
 * diferido: el arranque no lo necesita.
 */
class ApiBarrasRepository extends IBarrasRepository {
  /** @override */
  async changeTee(enrollmentId, teeColor) {
    const r = await apiRequest(
      `/api/v1/enrollments/${segmento(enrollmentId)}/tee`,
      { method: 'PUT', body: JSON.stringify({ tee_color: teeColor }) },
    );
    return { id: r.id, teeColor: r.tee_color ?? null };
  }

  /** @override */
  async getTees(enrollmentId) {
    const r = await apiRequest(
      `/api/v1/enrollments/${segmento(enrollmentId)}/tees`,
    );
    return {
      generalTee: r.general_tee ?? null,
      defaultTee: r.default_tee ?? null,
      courses: (r.courses ?? []).map(aCampo),
    };
  }

  /** @override */
  async changeCourseTee(enrollmentId, golfCourseId, teeColor) {
    const r = await apiRequest(
      `/api/v1/enrollments/${segmento(enrollmentId)}/courses/${segmento(golfCourseId)}/tee`,
      { method: 'PUT', body: JSON.stringify({ tee_color: teeColor }) },
    );
    return { teeColor: r.tee_color ?? null };
  }

  /** @override */
  async setCourseTee(competitionId, golfCourseId, gender, teeColor) {
    const r = await apiRequest(
      `/api/v1/competitions/${segmento(competitionId)}/courses/${segmento(golfCourseId)}/tee`,
      { method: 'PUT', body: JSON.stringify({ gender, tee_color: teeColor }) },
    );
    return { gender: r.gender, teeColor: r.tee_color ?? null };
  }

  /** @override */
  async getCourseTees(competitionId) {
    const filas = await apiRequest(
      `/api/v1/competitions/${segmento(competitionId)}/course-tees`,
    );
    return filas.map((f) => ({
      golfCourseId: f.golf_course_id,
      gender: f.gender,
      teeColor: f.tee_color,
    }));
  }
}

export default ApiBarrasRepository;
