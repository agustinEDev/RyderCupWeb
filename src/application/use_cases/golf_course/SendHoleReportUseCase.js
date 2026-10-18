import { enviarReporteDeHoyo } from './enviarReporteDeHoyo';

const esPunto = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lon);

/**
 * SendHoleReportUseCase: el jugador reporta un hoyo con un motivo y la línea
 * que propone (entrega 7, 18 oct 2026). Anónimo, como las muestras: el servidor
 * no guarda quién.
 *
 * Va a la cola del móvil antes de nada: sin cobertura se queda ahí y sale sola
 * cuando vuelva (R5). El `id` lo pone el mapa: el mismo reporte enviado otra vez
 * sustituye al de la cola, y en el servidor cuenta una vez.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 * @param {IHoleReportStore} dependencies.holeReportStore
 * @param {Function} [dependencies.ahora] - la hora, en ISO con zona
 * @param {Function} [dependencies.reportarFallo] - avisa de un fallo nuestro (a Sentry)
 * @param {Set} [dependencies.enVuelo] - los que van de camino, compartido con el vaciado de la cola
 */
class SendHoleReportUseCase {
  constructor({ golfCourseRepository, holeReportStore, ahora = () => new Date().toISOString(), reportarFallo = () => {}, enVuelo = new Set() }) {
    this.dependencias = { golfCourseRepository, holeReportStore, reportarFallo, enVuelo };
    this.ahora = ahora;
  }

  /**
   * @param {{userId: string, golfCourseId: string, holeNumber: number, id: string, reason: string, tee: Object, bends?: Object[], greenCenter: Object}} datos
   */
  async execute({ userId, golfCourseId, holeNumber, id, reason, tee, bends, greenCenter }) {
    if (!userId || !golfCourseId) return { estado: 'ignorado' };
    // El mapa siempre pone el id, la salida y el green: si falta algo, es un
    // fallo nuestro, y en la cola atascaría a los demás
    const codosBien = bends == null || (Array.isArray(bends) && bends.every(esPunto));
    if (!id || !esPunto(tee) || !esPunto(greenCenter) || !codosBien) {
      this.dependencias.reportarFallo(new Error(id ? 'Reporte de hoyo sin línea' : 'Reporte de hoyo sin id'), { golfCourseId, holeNumber });
      return { estado: 'ignorado' };
    }
    const entrada = { id, golfCourseId, holeNumber, reason, tee, bends: bends ?? [], greenCenter, enCola: this.ahora() };
    this.dependencias.holeReportStore.ponerEnCola(userId, entrada);
    return enviarReporteDeHoyo(this.dependencias, userId, entrada);
  }
}

export default SendHoleReportUseCase;
