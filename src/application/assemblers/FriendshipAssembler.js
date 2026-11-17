import Friendship from '../../domain/entities/Friendship';
import { nombrePequeno } from '../../utils/nombreVisible';

/**
 * FriendshipAssembler - Application Layer
 *
 * Converts Friendship domain entities to simple DTOs for the UI.
 */
class FriendshipAssembler {
  /**
   * Converts a domain entity to a simple DTO for the UI.
   *
   * @param {Friendship} friendship - Domain entity
   * @param {Object} apiData - Original API data (optional, for requester_name/addressee_name)
   * @param {string|null} currentUserId - Current user id, used to compute "the other person" fields
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(friendship, apiData = null, currentUserId = null) {
    if (!(friendship instanceof Friendship)) {
      throw new Error(
        'FriendshipAssembler.toSimpleDTO: friendship must be a Friendship instance',
      );
    }

    const simpleDTO = {
      id: friendship.id,
      requesterId: friendship.requesterId,
      addresseeId: friendship.addresseeId,
      status: friendship.status.toString(),
      respondedAt: friendship.respondedAt?.toISOString() || null,
      createdAt: friendship.createdAt.toISOString(),
      updatedAt: friendship.updatedAt.toISOString(),

      // Computed fields
      isPending: friendship.isPending(),
      isAccepted: friendship.isAccepted(),
      isDeclined: friendship.isDeclined(),
      isBlocked: friendship.isBlocked(),
    };

    if (apiData) {
      if (apiData.requester_name)
        simpleDTO.requesterName = apiData.requester_name;
      if (apiData.addressee_name)
        simpleDTO.addresseeName = apiData.addressee_name;
    }

    if (currentUserId) {
      const isRequester = friendship.requesterId === currentUserId;
      simpleDTO.otherUserId = friendship.otherUserId(currentUserId);
      simpleDTO.otherUserName = isRequester
        ? simpleDTO.addresseeName
        : simpleDTO.requesterName;
      // El otro nombre del otro lado, pequeño debajo (SB-08). Lo traen la lista de
      // amigos y la de solicitudes; si no, null
      const lado = isRequester ? 'addressee' : 'requester';
      const [nombre = '', ...apellidos] = (
        apiData?.[`${lado}_real_name`] ?? ''
      ).split(' ');
      simpleDTO.otherUserSubName =
        nombrePequeno({
          display_name: simpleDTO.otherUserName,
          alias: apiData?.[`${lado}_alias`] ?? null,
          first_name: nombre,
          last_name: apellidos.join(' '),
        }) || null;
      // El del otro lado, para el resumen de la partida rápida antes de crear
      // nada (FE #848). Solo lo trae la lista de amigos; si no, null
      simpleDTO.otherUserHandicap =
        (isRequester
          ? apiData?.addressee_handicap
          : apiData?.requester_handicap) ?? null;
      simpleDTO.isSentByMe = isRequester;
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Friendship>} friendships - Array of domain entities
   * @param {Array<Object>} apiDataArray - Array of original API data (optional)
   * @param {string|null} currentUserId
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(
    friendships,
    apiDataArray = null,
    currentUserId = null,
  ) {
    if (!Array.isArray(friendships)) {
      throw new Error(
        'FriendshipAssembler.toSimpleDTOMany: friendships must be an array',
      );
    }

    return friendships.map((friendship, index) => {
      const apiData = apiDataArray ? apiDataArray[index] : null;
      return FriendshipAssembler.toSimpleDTO(
        friendship,
        apiData,
        currentUserId,
      );
    });
  }
}

export default FriendshipAssembler;
