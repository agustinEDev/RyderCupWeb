/**
 * GetHoleSamplesUseCase: las muestras de cada hoyo de un campo (BE #532,
 * marcado por par), y las del jugador que esperan en la cola.
 *
 * El resumen es público (el mismo para cualquiera) y se guarda en el móvil como
 * la ubicación del campo: `guardadas` lo da al momento (con mala cobertura la
 * petición no falla, se queda colgada); `execute` lo pide al servidor y lo
 * guarda. Si el servidor falla, el del móvil.
 *
 * `pendientes` son las del jugador en ese campo que aún no han salido, por
 * hoyo: una hecha sin cobertura se sigue dibujando.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleSampleStore} dependencies.holeSampleStore
 */
class GetHoleSamplesUseCase {
  constructor({ golfCourseRepository, holeSampleStore }) {
    this.golfCourseRepository = golfCourseRepository;
    this.holeSampleStore = holeSampleStore;
  }

  guardadas(golfCourseId) {
    if (!golfCourseId) return {};
    return this.holeSampleStore.loadResumen(golfCourseId) ?? {};
  }

  async execute(golfCourseId) {
    if (!golfCourseId) return {};
    try {
      const resumen = await this.golfCourseRepository.getHoleSamples(golfCourseId);
      this.holeSampleStore.saveResumen(golfCourseId, resumen);
      return resumen;
    } catch {
      // Se queda el del móvil
      return this.guardadas(golfCourseId);
    }
  }

  pendientes(userId, golfCourseId) {
    if (!userId || !golfCourseId) return {};
    return Object.fromEntries(
      this.holeSampleStore
        .cola(userId)
        .filter((entrada) => entrada.golfCourseId === golfCourseId)
        .map(({ holeNumber, tee, bends, greenCenter }) => [holeNumber, { tee, bends, greenCenter }]),
    );
  }
}

export default GetHoleSamplesUseCase;
