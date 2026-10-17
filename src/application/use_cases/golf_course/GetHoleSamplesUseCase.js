import { esLaMismaBarra } from '../../../domain/services/muestrasDeLaBarra';
import { crearRecienEnviadas } from './recienEnviadas';

/**
 * GetHoleSamplesUseCase: las muestras de cada hoyo de un campo (BE #575, 17 oct:
 * una referencia por hoyo, de cualquier barra), y las del jugador que esperan
 * en la cola.
 *
 * El resumen es público (el mismo para cualquiera) y se guarda en el móvil,
 * como la ubicación del campo: `guardadas` lo da al momento (con mala
 * cobertura la petición no falla, se queda colgada); `execute` lo pide al
 * servidor y lo guarda. Si el servidor falla, el del móvil. Por hoyo,
 * `{ guardada, primera, green, recoge }`.
 *
 * `pendientes` son las del jugador en ese campo y con esa barra que aún no han
 * salido, por hoyo: una hecha sin cobertura se sigue dibujando. También las
 * que acaban de llegar mientras ningún resumen las trae (si tras el 2xx el
 * resumen falla, no desaparecen del mapa); la de la cola, si hay, va antes.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleSampleStore} dependencies.holeSampleStore
 * @param {Object} [dependencies.recienEnviadas] - las que llegaron y el resumen aún no trae, compartido
 */
class GetHoleSamplesUseCase {
  constructor({ golfCourseRepository, holeSampleStore, recienEnviadas = crearRecienEnviadas() }) {
    this.golfCourseRepository = golfCourseRepository;
    this.holeSampleStore = holeSampleStore;
    this.recienEnviadas = recienEnviadas;
  }

  guardadas(golfCourseId) {
    if (!golfCourseId) return {};
    return this.holeSampleStore.loadResumen(golfCourseId) ?? {};
  }

  async execute(golfCourseId) {
    if (!golfCourseId) return {};
    // Las que lleguen mientras se pide no pueden venir en este resumen
    const turno = this.recienEnviadas.turno();
    try {
      const resumen = await this.golfCourseRepository.getHoleSamples(golfCourseId);
      this.holeSampleStore.saveResumen(golfCourseId, resumen);
      this.recienEnviadas.olvidar(golfCourseId, turno);
      return resumen;
    } catch {
      // Se queda el del móvil
      return this.guardadas(golfCourseId);
    }
  }

  pendientes(userId, golfCourseId, barra) {
    if (!userId || !golfCourseId || !barra) return {};
    // Mi barra, o la de mi color sin género: como el servidor (`tee_for`) y
    // como `muestrasDeLaBarra`
    const esMia = (otra) => esLaMismaBarra(otra, barra) || (Boolean(barra.gender) && esLaMismaBarra(otra, { color: barra.color, gender: null }));
    const deEsteCampo = (entradas) =>
      Object.fromEntries(
        entradas
          .filter((entrada) => entrada.golfCourseId === golfCourseId && esMia(entrada.barra))
          .map(({ holeNumber, tee, bends, greenCenter }) => [holeNumber, { tee, bends, greenCenter }]),
      );
    // Lo suyo, de más viejo a más nuevo: lo ya enviado, lo recién enviado y lo
    // que espera en la cola
    return {
      ...deEsteCampo(this.holeSampleStore.mias(userId)),
      ...this.recienEnviadas.de(userId, golfCourseId, barra),
      ...deEsteCampo(this.holeSampleStore.cola(userId)),
    };
  }
}

export default GetHoleSamplesUseCase;
