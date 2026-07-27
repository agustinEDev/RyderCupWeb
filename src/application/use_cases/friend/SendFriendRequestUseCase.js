import FriendshipAssembler from '../../assemblers/FriendshipAssembler';

/**
 * Use Case: Send Friend Request
 *
 * Sends a friend request to another registered user.
 */
class SendFriendRequestUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('SendFriendRequestUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(addresseeId) {
    if (!addresseeId || typeof addresseeId !== 'string') {
      throw new Error('addresseeId is required');
    }

    const friendship = await this.#friendRepository.sendRequest(addresseeId);
    return FriendshipAssembler.toSimpleDTO(friendship, friendship._apiData);
  }
}

export default SendFriendRequestUseCase;
