/**
 * Las sesiones de mis competiciones que se quedaron sin partidos (BE #361).
 *
 * Los partidos se crean al abrirse los sobres, y cuando no pueden crearse
 * —a alguien le falta el género, el campo no tiene su color— no hay nadie
 * mirando. Esto alimenta el aviso del organizador en «Requiere tu Atención»:
 * sin él se enteraría a la hora de jugar.
 */
class ListMySessionsWithoutMatchesUseCase {
  constructor({ envelopeRepository }) {
    this.envelopeRepository = envelopeRepository;
  }

  async execute() {
    return await this.envelopeRepository.listMySessionsWithoutMatches();
  }
}

export default ListMySessionsWithoutMatchesUseCase;
