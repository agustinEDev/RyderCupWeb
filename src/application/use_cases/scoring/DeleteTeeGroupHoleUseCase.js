const LADOS = ['own', 'marker', 'both'];

/** El organizador borra lo anotado en un hoyo: el lado del jugador, el del marcador o los dos (RyderCupAm#553). */
class DeleteTeeGroupHoleUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId, holeNumber, side) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    if (!Number.isInteger(holeNumber) || holeNumber < 1 || holeNumber > 18) throw new Error('Hole number must be 1-18');
    if (!LADOS.includes(side)) throw new Error('Side must be own, marker or both');
    return this.teeGroupScoringRepository.deleteHole(groupId, userId, holeNumber, side);
  }
}

export default DeleteTeeGroupHoleUseCase;
