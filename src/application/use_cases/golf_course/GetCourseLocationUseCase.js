import { esPosicionValida } from '../../../domain/services/geometriaDelHoyo';

/**
 * GetCourseLocationUseCase: dónde está un campo, para el mapa del hoyo (BE #532).
 *
 * `guardada` da al momento la última que se supo (sin cobertura la petición
 * no falla, se queda colgada); `execute` la pide al servidor y la guarda. Sin
 * coordenadas válidas, `null`.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {ICourseLocationCache} dependencies.courseLocationCache
 */
class GetCourseLocationUseCase {
  constructor({ golfCourseRepository, courseLocationCache }) {
    this.golfCourseRepository = golfCourseRepository;
    this.courseLocationCache = courseLocationCache;
  }

  guardada(golfCourseId) {
    if (!golfCourseId) return null;
    const ubicacion = this.courseLocationCache.load(golfCourseId);
    return esPosicionValida(ubicacion) ? ubicacion : null;
  }

  async execute(golfCourseId) {
    if (!golfCourseId) return null;
    const campo = await this.golfCourseRepository.getById(golfCourseId);
    const ubicacion = { lat: campo?.location?.latitude, lon: campo?.location?.longitude };
    if (!esPosicionValida(ubicacion)) return null;
    this.courseLocationCache.save(golfCourseId, ubicacion);
    return ubicacion;
  }
}

export default GetCourseLocationUseCase;
