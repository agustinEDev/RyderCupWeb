class GetScheduleUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return await this.scheduleRepository.getSchedule(competitionId);
  }
}

export default GetScheduleUseCase;
