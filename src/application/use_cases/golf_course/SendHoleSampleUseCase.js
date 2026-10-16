import { enviarMuestraDeHoyo } from './enviarMuestraDeHoyo';

/**
 * SendHoleSampleUseCase: el jugador marca un hoyo y sale una muestra, anónima
 * (BE #532, marcado por par).
 *
 * Va a la cola del móvil antes de nada: si no hay cobertura, se queda ahí y se
 * envía sola cuando vuelva, y mientras tanto el mapa la sigue dibujando. Del
 * mismo hoyo solo se guarda la última. Nada de esto se le dice al jugador.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleSampleStore} dependencies.holeSampleStore
 * @param {Function} [dependencies.ahora] - la hora, en ISO con zona
 * @param {Function} [dependencies.reportarFallo] - avisa de un fallo nuestro (a Sentry)
 * @param {Set} [dependencies.enVuelo] - las que van de camino, compartido con el vaciado de la cola
 */
class SendHoleSampleUseCase {
  constructor({ golfCourseRepository, holeSampleStore, ahora = () => new Date().toISOString(), reportarFallo = () => {}, enVuelo = new Set() }) {
    this.dependencias = { golfCourseRepository, holeSampleStore, reportarFallo, enVuelo };
    this.ahora = ahora;
  }

  /**
   * `alQuedarEnCola` avisa en cuanto la muestra está en el móvil, antes de
   * enviarla: con mala cobertura el envío tarda, y el mapa la dibuja ya.
   *
   * @param {{userId: string, golfCourseId: string, holeNumber: number, tee: Object, bends?: Object[], greenCenter: Object, alQuedarEnCola?: Function}} datos
   */
  async execute({ userId, golfCourseId, holeNumber, tee, bends, greenCenter, alQuedarEnCola = () => {} }) {
    // Sin sesión no hay cola de quién, y sin campo no hay a dónde
    if (!userId || !golfCourseId) return { estado: 'ignorada' };
    const entrada = { golfCourseId, holeNumber, tee, bends: bends ?? [], greenCenter, enCola: this.ahora() };
    this.dependencias.holeSampleStore.ponerEnCola(userId, entrada);
    alQuedarEnCola(entrada);
    return enviarMuestraDeHoyo(this.dependencias, userId, entrada);
  }
}

export default SendHoleSampleUseCase;
