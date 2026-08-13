/**
 * ListGolfCoursesUseCase
 * Lists golf courses with optional filtering
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class ListGolfCoursesUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {Object} filters - Optional filters
   * @param {string} filters.approvalStatus - Filter by approval status
   * @param {string} filters.countryCode - Filter by ISO country code
   * @param {string} filters.name - Partial name search, filtered in the database
   * @param {number} filters.limit - Page size. Without it every course comes back
   * @param {number} filters.offset - Courses to skip
   * @param {number} filters.lat - Latitude. With lon, sorts nearest first and fills distanceKm
   * @param {number} filters.lon - Longitude. Required alongside lat
   * @param {number} filters.radiusKm - Optional cap in km. Needs a position
   * @returns {Promise<{courses: GolfCourse[], total: number}>} Page and how many match
   */
  async execute(filters = {}) {
    return await this.golfCourseRepository.list(filters);
  }
}

export default ListGolfCoursesUseCase;
