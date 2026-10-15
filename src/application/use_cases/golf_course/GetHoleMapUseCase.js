/**
 * GetHoleMapUseCase: el mapa de hoyos de un campo para la anotación (BE #532).
 *
 * Con red, el del servidor, que se guarda; sin red (o si la petición falla), la
 * copia guardada. Sin mapa aprobado, `null`: la anotación queda como siempre.
 *
 * `guardado` da la copia al momento: con mala cobertura la petición no falla,
 * se queda sin contestar, y la copia es justo para ese caso.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleMapCache} dependencies.holeMapCache
 */
class GetHoleMapUseCase {
  constructor({ golfCourseRepository, holeMapCache }) {
    this.golfCourseRepository = golfCourseRepository;
    this.holeMapCache = holeMapCache;
  }

  guardado(golfCourseId) {
    if (!golfCourseId) return null;
    return this.holeMapCache.load(golfCourseId);
  }

  async execute(golfCourseId) {
    if (!golfCourseId) return null;
    let mapa;
    try {
      mapa = await this.golfCourseRepository.getHoleMap(golfCourseId);
    } catch {
      return this.holeMapCache.load(golfCourseId);
    }
    if (mapa === null) {
      // Ya no hay mapa aprobado: la copia tampoco vale
      this.holeMapCache.remove(golfCourseId);
      return null;
    }
    this.holeMapCache.save(mapa);
    return mapa;
  }
}

export default GetHoleMapUseCase;
