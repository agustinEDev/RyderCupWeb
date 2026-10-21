import { instanteDeLaApi } from '../../utils/instanteDeLaApi';

// Un instante de la API, o null si no viene o no se puede leer
const instante = (texto) => {
  if (!texto) return null;
  const fecha = instanteDeLaApi(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * ActivityEventMapper - Traduce el feed de la API al dominio del cliente.
 *
 * El backend manda `payload`, un objeto cuyo contenido depende del tipo de
 * evento: cuántos birdies y en qué hoyos, qué diferencial batió a cuál, en qué
 * campo. Se deja pasar tal cual en lugar de aplanarlo, porque cada tipo dibuja
 * su propia frase y añadir un tipo nuevo no debería obligar a tocar esto.
 */
class ActivityEventMapper {
  /** Una entrada del feed. */
  static toDomain(apiEvent) {
    return {
      id: apiEvent.id,
      userId: apiEvent.user_id,
      type: apiEvent.type,
      occurredAt: instante(apiEvent.occurred_at),
      // Cuándo llegó al feed: por esto se ordena y se cuenta lo nuevo (BE-1).
      // Un torneo publica días después de sus vueltas
      publishedAt: instante(apiEvent.published_at),
      payload: apiEvent.payload || {},
      sourceMatchId: apiEvent.source_match_id ?? null,
      // La tarjeta en la que va: los logros de una vuelta comparten clave
      groupKey: apiEvent.group_key ?? null,
    };
  }

  /** Quién publicó una entrada, para no pedir un perfil por cada una. */
  static authorToDomain(apiAuthor) {
    return {
      id: apiAuthor.id,
      firstName: apiAuthor.first_name,
      lastName: apiAuthor.last_name,
      // Ya resuelto por el servidor: alias si lo tiene (BE #239)
      displayName: apiAuthor.display_name || null,
      avatarSource: apiAuthor.avatar_source,
      avatarPresetId: apiAuthor.avatar_preset_id,
    };
  }

  /** Una página completa del feed. */
  static feedToDomain(apiResponse) {
    const authors = {};
    Object.entries(apiResponse.authors || {}).forEach(([id, author]) => {
      authors[id] = ActivityEventMapper.authorToDomain(author);
    });

    // Las solicitudes de amistad sin responder (BE-2). Quien la pide entra en
    // los autores, que es de donde la pantalla saca nombres y fotos. Una sin
    // solicitante no se puede aceptar ni pintar: se descarta
    const pendingFriendRequests = [];
    (apiResponse.pending_friend_requests || []).forEach((request) => {
      if (!request?.friendship_id || !request.requester?.id) return;
      authors[request.requester.id] ??= ActivityEventMapper.authorToDomain(request.requester);
      pendingFriendRequests.push({
        friendshipId: request.friendship_id,
        requesterId: request.requester.id,
        createdAt: instante(request.created_at),
      });
    });

    return {
      events: (apiResponse.events || []).map(ActivityEventMapper.toDomain),
      authors,
      // Los nombres de campo llegan sueltos, no dentro de cada evento: el
      // backend los resuelve al leer porque el payload solo guarda el id
      courses: apiResponse.courses || {},
      nextCursor: apiResponse.next_cursor ?? null,
      unseenCount: apiResponse.unseen_count ?? 0,
      pendingFriendRequests,
    };
  }
}

export default ActivityEventMapper;
