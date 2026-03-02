/**
 * Use Case: Search Users
 *
 * Searches registered users by name or email for invitation purposes.
 */
class SearchUsersUseCase {
  #userRepository;

  constructor({ userRepository }) {
    if (!userRepository) {
      throw new Error('SearchUsersUseCase requires userRepository');
    }
    this.#userRepository = userRepository;
  }

  async execute(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    return this.#userRepository.searchUsers(query.trim());
  }
}

export default SearchUsersUseCase;
