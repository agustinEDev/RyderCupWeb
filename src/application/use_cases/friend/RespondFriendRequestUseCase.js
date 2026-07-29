import FriendshipAssembler from '../../assemblers/FriendshipAssembler';

/**
 * Use Case: Respond to Friend Request
 *
 * Accepts or declines a pending friend request.
 */
class RespondFriendRequestUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('RespondFriendRequestUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(friendshipId, action) {
    if (!friendshipId || typeof friendshipId !== 'string') {
      throw new Error('friendshipId is required');
    }
    if (action !== 'ACCEPT' && action !== 'DECLINE') {
      throw new Error("action must be 'ACCEPT' or 'DECLINE'");
    }

    const friendship = await this.#friendRepository.respondToRequest(friendshipId, action);
    return FriendshipAssembler.toSimpleDTO(friendship, friendship._apiData);
  }
}

export default RespondFriendRequestUseCase;
