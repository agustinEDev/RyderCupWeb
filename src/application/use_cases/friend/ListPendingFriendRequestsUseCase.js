import FriendshipAssembler from '../../assemblers/FriendshipAssembler';

/**
 * Use Case: List Pending Friend Requests
 *
 * Retrieves the current user's pending friend requests, received or sent.
 */
class ListPendingFriendRequestsUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('ListPendingFriendRequestsUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(currentUserId, direction = 'received', filters = {}) {
    if (direction !== 'received' && direction !== 'sent') {
      throw new Error("direction must be 'received' or 'sent'");
    }

    const result = await this.#friendRepository.getPendingRequests(direction, filters);

    const dtos = result.friendships.map((friendship) =>
      FriendshipAssembler.toSimpleDTO(friendship, friendship._apiData, currentUserId)
    );

    return {
      friendships: dtos,
      totalCount: result.totalCount,
    };
  }
}

export default ListPendingFriendRequestsUseCase;
