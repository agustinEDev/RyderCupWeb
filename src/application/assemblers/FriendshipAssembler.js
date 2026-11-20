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
   * @param {Object|null} extras - Datos que acompañan a la amistad, en camelCase
   *   (nombres, alias, nombres reales y hándicaps de los dos lados); opcional
   * @param {string|null} currentUserId - Current user id, used to compute "the other person" fields
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(friendship, extras = null, currentUserId = null) {
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

    if (extras) {
      if (extras.requesterName) simpleDTO.requesterName = extras.requesterName;
      if (extras.addresseeName) simpleDTO.addresseeName = extras.addresseeName;
    }

    if (currentUserId) {
      const isRequester = friendship.requesterId === currentUserId;
      simpleDTO.otherUserId = friendship.otherUserId(currentUserId);
      simpleDTO.otherUserName = isRequester
        ? simpleDTO.addresseeName
        : simpleDTO.requesterName;
      // El otro nombre del otro lado, pequeño debajo (SB-08). Lo traen la lista de
      // amigos y la de solicitudes; si no, null
      const otherAlias = isRequester
        ? extras?.addresseeAlias
        : extras?.requesterAlias;
      const otherRealName = isRequester
        ? extras?.addresseeRealName
        : extras?.requesterRealName;
      simpleDTO.otherUserSubName =
        nombrePequeno({
          display_name: simpleDTO.otherUserName,
          alias: otherAlias ?? null,
          // El nombre real ya viene entero: va en `first_name` tal cual
          first_name: otherRealName ?? '',
        }) || null;
      // El del otro lado, para el resumen de la partida rápida antes de crear
      // nada (FE #848). Solo lo trae la lista de amigos; si no, null
      simpleDTO.otherUserHandicap =
        (isRequester ? extras?.addresseeHandicap : extras?.requesterHandicap) ??
        null;
      simpleDTO.isSentByMe = isRequester;
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Friendship>} friendships - Array of domain entities
   * @param {Array<Object|null>} extrasArray - Extras de cada amistad, en el mismo orden (opcional)
   * @param {string|null} currentUserId
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(
    friendships,
    extrasArray = null,
    currentUserId = null,
  ) {
    if (!Array.isArray(friendships)) {
      throw new Error(
        'FriendshipAssembler.toSimpleDTOMany: friendships must be an array',
      );
    }

    return friendships.map((friendship, index) => {
      const extras = extrasArray ? extrasArray[index] : null;
      return FriendshipAssembler.toSimpleDTO(friendship, extras, currentUserId);
    });
  }
}

export default FriendshipAssembler;
