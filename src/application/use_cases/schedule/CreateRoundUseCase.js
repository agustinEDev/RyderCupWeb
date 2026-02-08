class CreateRoundUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId, roundData) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    if (!roundData || typeof roundData !== 'object') {
      throw new Error('Round data is required');
    }
    if (!roundData.golf_course_id) {
      throw new Error('Golf course ID is required');
    }
    if (!roundData.round_date) {
      throw new Error('Round date is required');
    }
    if (!roundData.session_type) {
      throw new Error('Session type is required');
    }
    if (!roundData.match_format) {
      throw new Error('Match format is required');
    }
    return await this.scheduleRepository.createRound(competitionId, roundData);
  }
}

export default CreateRoundUseCase;
