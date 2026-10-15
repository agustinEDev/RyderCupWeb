import { enviarMarcaDeHoyo } from './enviarMarcaDeHoyo';

/**
 * SendPendingHoleMarksUseCase: envía las marcas que se quedaron en el móvil
 * sin cobertura (BE #532, PR C), solo las de quien tiene la sesión.
 *
 * Una a una y una tanda a la vez: el evento de vuelta de la red llega a veces
 * dos veces, y la misma marca no tiene por qué salir dos. Si una no sale por
 * falta de red, el resto tampoco saldría: se para ahí.
 */
class SendPendingHoleMarksUseCase {
  constructor({ golfCourseRepository, holeMarkStore, reportarFallo = () => {} }) {
    this.dependencias = { golfCourseRepository, holeMarkStore, reportarFallo };
    this.enMarcha = null;
  }

  /** @returns {Promise<{enviadas: number, rechazadas: number, pendientes: number}>} */
  execute(userId) {
    this.enMarcha ??= this.vaciar(userId).finally(() => {
      this.enMarcha = null;
    });
    return this.enMarcha;
  }

  async vaciar(userId) {
    const cuenta = { enviadas: 0, rechazadas: 0, pendientes: 0 };
    const todas = this.dependencias.holeMarkStore.pendientes(userId);
    for (const [i, { golfCourseId, marca }] of todas.entries()) {
      const { estado } = await enviarMarcaDeHoyo(this.dependencias, userId, golfCourseId, marca);
      if (estado === 'pendiente') {
        cuenta.pendientes = todas.length - i;
        break;
      }
      if (estado === 'guardada') cuenta.enviadas += 1;
      else cuenta.rechazadas += 1;
    }
    return cuenta;
  }
}

export default SendPendingHoleMarksUseCase;
