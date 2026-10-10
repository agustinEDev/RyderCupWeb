/**
 * Las plazas que me asignaron desde una lista de espera y aún no he visto
 * (FE #824): salen en «Requiere tu atención» hasta pulsar «Entendido».
 */
class ListMyAssignedPlacesUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute() {
    return this.scheduleRepository.getMyAssignedPlaces();
  }
}

export default ListMyAssignedPlacesUseCase;
