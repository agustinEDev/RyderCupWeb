import { enviarMarcaDeHoyo } from './enviarMarcaDeHoyo';

/**
 * SaveHoleMarkUseCase: el jugador marca un hoyo (BE #532, PR C).
 *
 * La marca se guarda en el móvil antes de nada: se ve ya y, si no hay
 * cobertura, se queda pendiente y se envía sola cuando vuelva. Lleva la hora en
 * que se hizo, para que una que espera en la cola no pise a otra posterior.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleMarkStore} dependencies.holeMarkStore
 * @param {Function} [dependencies.ahora] - la hora, en ISO con zona
 * @param {Function} [dependencies.reportarFallo] - avisa de un fallo que no es de red
 */
class SaveHoleMarkUseCase {
  constructor({ golfCourseRepository, holeMarkStore, ahora = () => new Date().toISOString(), reportarFallo = () => {} }) {
    this.dependencias = { golfCourseRepository, holeMarkStore, reportarFallo };
    this.ahora = ahora;
  }

  /**
   * `alGuardarEnElMovil` avisa en cuanto la marca está en el móvil, antes de
   * enviarla: con mala cobertura el envío tarda, y la marca se usa ya.
   *
   * @param {{userId: string, golfCourseId: string, holeNumber: number, tee: Object|null, bends: Object[], greenCenter: Object, alGuardarEnElMovil?: Function}} datos
   */
  async execute({ userId, golfCourseId, holeNumber, tee, bends, greenCenter, alGuardarEnElMovil = () => {} }) {
    const marca = { holeNumber, tee: tee ?? null, bends: tee ? bends : [], greenCenter, markedAt: this.ahora() };
    this.dependencias.holeMarkStore.ponerPendiente(userId, golfCourseId, marca);
    alGuardarEnElMovil(marca);
    return enviarMarcaDeHoyo(this.dependencias, userId, golfCourseId, marca);
  }
}

export default SaveHoleMarkUseCase;
