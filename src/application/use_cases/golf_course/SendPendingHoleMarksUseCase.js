import { enviarMarcaDeHoyo } from './enviarMarcaDeHoyo';

/**
 * SendPendingHoleMarksUseCase: envía las marcas que se quedaron en el móvil
 * sin cobertura (BE #532, PR C), solo las de quien tiene la sesión.
 *
 * Una a una y una tanda a la vez por jugador: el evento de vuelta de la red
 * llega a veces dos veces, y la misma marca no tiene por qué salir dos. Sin
 * red (o con el tope de peticiones) se para ahí, que el resto tampoco
 * saldría; un error del servidor con una no detiene las de los demás campos.
 *
 * `sigue` se mira antes de cada envío: en un móvil compartido, si cambia la
 * sesión a mitad, lo que queda de uno no puede salir con las cookies de otro.
 */
class SendPendingHoleMarksUseCase {
  constructor({ golfCourseRepository, holeMarkStore, reportarFallo = () => {} }) {
    this.dependencias = { golfCourseRepository, holeMarkStore, reportarFallo };
    this.enMarcha = new Map();
  }

  /** @returns {Promise<{enviadas: number, rechazadas: number, pendientes: number}>} */
  execute(userId, { sigue = () => true } = {}) {
    if (!this.enMarcha.has(userId)) {
      this.enMarcha.set(
        userId,
        this.vaciar(userId, sigue).finally(() => this.enMarcha.delete(userId)),
      );
    }
    return this.enMarcha.get(userId);
  }

  async vaciar(userId, sigue) {
    const cuenta = { enviadas: 0, rechazadas: 0, pendientes: 0 };
    const todas = this.dependencias.holeMarkStore.pendientes(userId);
    for (const [i, { golfCourseId, marca }] of todas.entries()) {
      if (!sigue()) {
        cuenta.pendientes += todas.length - i;
        break;
      }
      const resultado = await enviarMarcaDeHoyo(this.dependencias, userId, golfCourseId, marca);
      if (resultado.estado === 'pendiente') {
        cuenta.pendientes += 1;
        if (resultado.sinRed) {
          cuenta.pendientes += todas.length - i - 1;
          break;
        }
      } else if (resultado.estado === 'guardada') {
        cuenta.enviadas += 1;
      } else {
        cuenta.rechazadas += 1;
        // Nadie mira la pantalla: que conste por qué se fue
        this.dependencias.reportarFallo(new Error(`Marca de hoyo rechazada: ${resultado.errorCode}`), {
          golfCourseId,
          holeNumber: marca.holeNumber,
          errorCode: resultado.errorCode,
        });
      }
    }
    return cuenta;
  }
}

export default SendPendingHoleMarksUseCase;
