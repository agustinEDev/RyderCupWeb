import FriendshipAssembler from '../../assemblers/FriendshipAssembler';

/**
 * Use Case: List Friends
 *
 * Retrieves the current user's accepted friendships.
 */
class ListFriendsUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('ListFriendsUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(currentUserId, filters = {}) {
    const result = await this.#friendRepository.getFriends(filters);

    const dtos = result.friendships.map((friendship) =>
      FriendshipAssembler.toSimpleDTO(friendship, friendship._apiData, currentUserId)
    );

    return {
      friendships: dtos,
      totalCount: result.totalCount,
    };
  }
}

export default ListFriendsUseCase;
