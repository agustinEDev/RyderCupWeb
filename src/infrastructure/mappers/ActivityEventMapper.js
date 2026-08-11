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
      occurredAt: apiEvent.occurred_at ? new Date(apiEvent.occurred_at) : null,
      payload: apiEvent.payload || {},
      sourceMatchId: apiEvent.source_match_id,
    };
  }

  /** Quién publicó una entrada, para no pedir un perfil por cada una. */
  static authorToDomain(apiAuthor) {
    return {
      id: apiAuthor.id,
      firstName: apiAuthor.first_name,
      lastName: apiAuthor.last_name,
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

    return {
      events: (apiResponse.events || []).map(ActivityEventMapper.toDomain),
      authors,
      nextCursor: apiResponse.next_cursor ?? null,
      unseenCount: apiResponse.unseen_count ?? 0,
    };
  }
}

export default ActivityEventMapper;
