/**
 * Use Case: Remove Friend
 *
 * Removes a friendship: unfriend (ACCEPTED), cancel a pending request (PENDING,
 * requester only), or unblock (BLOCKED, blocker only). Authorization is
 * enforced by the backend.
 */
class RemoveFriendUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('RemoveFriendUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(friendshipId) {
    if (!friendshipId || typeof friendshipId !== 'string') {
      throw new Error('friendshipId is required');
    }

    await this.#friendRepository.removeFriend(friendshipId);
  }
}

export default RemoveFriendUseCase;
