import { enviarReporteDeHoyo } from './enviarReporteDeHoyo';

/**
 * SendPendingHoleReportsUseCase: envía los reportes de hoyo que se quedaron en
 * la cola del móvil (entrega 7, 18 oct 2026), solo los de quien tiene la
 * sesión, uno a uno y en orden. Con un fallo que tumbaría a los demás (sin red,
 * el servidor, la sesión) se para ahí; `sigue` se mira antes de cada envío.
 */
class SendPendingHoleReportsUseCase {
  constructor({ golfCourseRepository, holeReportStore, reportarFallo = () => {}, enVuelo = new Set() }) {
    this.dependencias = { golfCourseRepository, holeReportStore, reportarFallo, enVuelo };
  }

  /** @returns {Promise<{enviados: number, descartados: number, pendientes: number}>} */
  async execute(userId, { sigue = () => true } = {}) {
    const cuenta = { enviados: 0, descartados: 0, pendientes: 0 };
    const todos = this.dependencias.holeReportStore.cola(userId);
    for (const [i, entrada] of todos.entries()) {
      if (!sigue()) {
        cuenta.pendientes += todos.length - i;
        break;
      }
      const { estado, paraLaTanda } = await enviarReporteDeHoyo(this.dependencias, userId, entrada);
      if (estado === 'enviado') cuenta.enviados += 1;
      else if (estado === 'descartado') cuenta.descartados += 1;
      else if (estado === 'pendiente') {
        cuenta.pendientes += 1;
        if (paraLaTanda) {
          cuenta.pendientes += todos.length - i - 1;
          break;
        }
      }
    }
    return cuenta;
  }
}

export default SendPendingHoleReportsUseCase;
