import { enviarMuestraDeHoyo } from './enviarMuestraDeHoyo';

/**
 * SendPendingHoleSamplesUseCase: envía las muestras de hoyo que se quedaron en
 * la cola del móvil (BE #532, marcado por par), solo las de quien tiene la
 * sesión.
 *
 * Una a una y una tanda a la vez por jugador: el evento de vuelta de la red
 * llega a veces dos veces, y la misma muestra no tiene por qué salir dos (cada
 * envío cuenta en el servidor). Con un fallo que tumbaría a las demás (sin
 * red, el servidor, la sesión) se para ahí.
 *
 * `sigue` se mira antes de cada envío: en un móvil compartido, si cambia la
 * sesión a mitad, lo que queda de uno no puede salir con las cookies de otro.
 */
class SendPendingHoleSamplesUseCase {
  constructor({ golfCourseRepository, holeSampleStore, reportarFallo = () => {}, enVuelo = new Set() }) {
    this.dependencias = { golfCourseRepository, holeSampleStore, reportarFallo, enVuelo };
    this.enMarcha = new Map();
  }

  /** @returns {Promise<{enviadas: number, descartadas: number, pendientes: number}>} */
  execute(userId, { sigue = () => true } = {}) {
    const enCurso = this.enMarcha.get(userId);
    if (enCurso?.sigue()) return enCurso.promesa;
    // Una tanda que ya se va a cortar (la sesión cambió y volvió): la nueva va detrás
    const promesa = (enCurso?.promesa ?? Promise.resolve())
      .catch(() => {})
      .then(() => this.vaciar(userId, sigue))
      .finally(() => {
        if (this.enMarcha.get(userId)?.promesa === promesa) this.enMarcha.delete(userId);
      });
    this.enMarcha.set(userId, { promesa, sigue });
    return promesa;
  }

  async vaciar(userId, sigue) {
    const cuenta = { enviadas: 0, descartadas: 0, pendientes: 0 };
    const todas = this.dependencias.holeSampleStore.cola(userId);
    for (const [i, entrada] of todas.entries()) {
      if (!sigue()) {
        cuenta.pendientes += todas.length - i;
        break;
      }
      const { estado, paraLaTanda } = await enviarMuestraDeHoyo(this.dependencias, userId, entrada);
      // La que ya va de camino la cuenta quien la envió
      if (estado === 'enviada') cuenta.enviadas += 1;
      else if (estado === 'descartada') cuenta.descartadas += 1;
      else if (estado === 'pendiente') {
        cuenta.pendientes += 1;
        if (paraLaTanda) {
          cuenta.pendientes += todas.length - i - 1;
          break;
        }
      }
    }
    return cuenta;
  }
}

export default SendPendingHoleSamplesUseCase;
