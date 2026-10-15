/**
 * GetMyHoleMarksUseCase: las marcas del jugador en un campo, por hoyo (BE #532,
 * PR C).
 *
 * `guardadas` da las del móvil al momento (con mala cobertura la petición se
 * queda sin contestar); `execute` las refresca del servidor sin pisar las que
 * esperan a enviarse, que son más nuevas. Sin red, las del móvil.
 */
class GetMyHoleMarksUseCase {
  constructor({ golfCourseRepository, holeMarkStore }) {
    this.golfCourseRepository = golfCourseRepository;
    this.holeMarkStore = holeMarkStore;
  }

  guardadas(userId, golfCourseId) {
    return this.holeMarkStore.load(userId, golfCourseId).marcas;
  }

  async execute(userId, golfCourseId) {
    if (!userId || !golfCourseId) return {};
    try {
      const delServidor = await this.golfCourseRepository.getMyHoleMarks(golfCourseId);
      this.holeMarkStore.ponerDelServidor(userId, golfCourseId, delServidor);
    } catch {
      // Se quedan las del móvil
    }
    return this.guardadas(userId, golfCourseId);
  }
}

export default GetMyHoleMarksUseCase;
