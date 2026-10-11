/**
 * Programar la actualización de hándicaps (FE #824). La hora va con su huso:
 * sin él el backend da un 422, así que no se manda.
 */
class ScheduleHandicapUpdateUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  async execute(competitionId, runAt) {
    if (!competitionId) throw new Error('Competition ID is required');
    if (typeof runAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(runAt)) {
      throw new Error('The scheduled time needs its time zone');
    }
    return this.competitionRepository.scheduleHandicapUpdate(competitionId, runAt);
  }
}

export default ScheduleHandicapUpdateUseCase;
