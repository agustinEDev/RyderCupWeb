/**
 * Use Case: Get Player Profile
 *
 * El perfil de un jugador. Siempre trae la ficha mínima —nombre, apellidos,
 * foto y número de amigos—; el correo, el hándicap, las estadísticas y la
 * actividad llegan en null si no sois amigos.
 */
class GetPlayerProfileUseCase {
  #socialFeedRepository;

  constructor({ socialFeedRepository }) {
    if (!socialFeedRepository) {
      throw new Error('GetPlayerProfileUseCase requires socialFeedRepository');
    }
    this.#socialFeedRepository = socialFeedRepository;
  }

  async execute(userId) {
    if (!userId) {
      throw new Error('GetPlayerProfileUseCase requires a userId');
    }
    return this.#socialFeedRepository.getPlayerProfile(userId);
  }
}

export default GetPlayerProfileUseCase;
