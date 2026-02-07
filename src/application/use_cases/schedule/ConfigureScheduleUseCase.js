class ConfigureScheduleUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId, config) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    if (!config || typeof config !== 'object') {
      throw new Error('Schedule configuration is required');
    }
    return await this.scheduleRepository.configureSchedule(competitionId, config);
  }
}

export default ConfigureScheduleUseCase;
