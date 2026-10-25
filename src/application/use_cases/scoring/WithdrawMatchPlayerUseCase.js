/**
 * Retira a un jugador de un fourball de torneo, o lo devuelve (25 oct 2026).
 * Quién puede y cuándo lo decide el backend (RyderCupAM#665).
 */
class WithdrawMatchPlayerUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(matchId, playerId, { deshacer = false } = {}) {
    if (!matchId) throw new Error('Match ID is required');
    if (!playerId) throw new Error('Player ID is required');
    return deshacer
      ? this.scoringRepository.reinstatePlayer(matchId, playerId)
      : this.scoringRepository.withdrawPlayer(matchId, playerId);
  }
}

export default WithdrawMatchPlayerUseCase;
