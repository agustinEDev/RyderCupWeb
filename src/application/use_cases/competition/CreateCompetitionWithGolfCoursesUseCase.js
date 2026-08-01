import CompetitionAssembler from '../../assemblers/CompetitionAssembler';

class CreateCompetitionWithGolfCoursesUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Creates a competition and attaches the given golf courses to it.
   *
   * Golf courses are attached one by one after creation (no backend endpoint
   * accepts them atomically at creation time), so a course-level failure does
   * not roll back the already-created competition or the courses already
   * attached — the caller gets a structured partial-failure result instead.
   *
   * @param {Object} competitionData - The data for the new competition (API DTO format).
   * @param {Array<{id: string, name: string}>} golfCourses - Golf courses to attach.
   * @returns {Promise<{competition: Object, successCount: number, failedCourses: string[]}>}
   */
  async execute(competitionData, golfCourses = []) {
    const newCompetition = await this.competitionRepository.save(competitionData);
    const competition = CompetitionAssembler.toSimpleDTO(newCompetition);

    let successCount = 0;
    const failedCourses = [];

    for (const golfCourse of golfCourses) {
      try {
        await this.competitionRepository.addGolfCourse(competition.id, golfCourse.id);
        successCount++;
      } catch (error) {
        console.error(`Error adding golf course ${golfCourse.name}:`, error);
        failedCourses.push(golfCourse.name);
      }
    }

    return { competition, successCount, failedCourses };
  }
}

export default CreateCompetitionWithGolfCoursesUseCase;
