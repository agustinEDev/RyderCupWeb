import FriendshipAssembler from '../../assemblers/FriendshipAssembler';

/**
 * Use Case: Block User
 *
 * Blocks another user, removing any existing friendship or pending request.
 */
class BlockUserUseCase {
  #friendRepository;

  constructor({ friendRepository }) {
    if (!friendRepository) {
      throw new Error('BlockUserUseCase requires friendRepository');
    }
    this.#friendRepository = friendRepository;
  }

  async execute(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required');
    }

    const friendship = await this.#friendRepository.blockUser(userId);
    return FriendshipAssembler.toSimpleDTO(friendship, friendship._apiData);
  }
}

export default BlockUserUseCase;
