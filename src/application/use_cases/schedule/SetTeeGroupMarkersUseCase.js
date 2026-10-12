/** Quién marca a quién en una partida, la partida entera (FE #824, PR 6). */
class SetTeeGroupMarkersUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(groupId, markers) {
    if (!groupId) throw new Error('Group ID is required');
    if (!markers?.length) throw new Error('Markers are required');
    return this.scheduleRepository.setTeeGroupMarkers(groupId, markers);
  }
}

export default SetTeeGroupMarkersUseCase;
