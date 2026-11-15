/**
 * Mis hándicaps sin actualizar con la RFEG (15 nov 2026): alimenta
 * «Requiere tu Atención». Como organizador, cuántos en cada competición; como
 * jugador, en cuáles no me encontró.
 */
class ListMyHandicapsNotUpdatedUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  async execute() {
    return this.competitionRepository.getMyHandicapsNotUpdated();
  }
}

export default ListMyHandicapsNotUpdatedUseCase;
