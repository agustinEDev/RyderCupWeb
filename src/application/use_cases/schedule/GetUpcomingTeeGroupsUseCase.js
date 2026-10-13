import { fechaLocal } from '../../../utils/fechaLocal';
import { companerosDe, esNoPresentado } from '../../../domain/services/PartidasDeLaFranja';

const POR_JUGAR = ['SCHEDULED', 'IN_PROGRESS'];
const COMPETICIONES_CON_PARTIDAS = ['CLOSED', 'IN_PROGRESS'];

/**
 * Las próximas partidas de stroke play del jugador, de todas sus competiciones
 * (FE #824, PR 7): el banner del panel enseña la más cercana entre estas y
 * los partidos de la Ryder. Como `GetUpcomingMatchesUseCase`: no hay endpoint
 * que lo responda, una competición que falle no tumba al resto, y se dice si
 * la lista está entera.
 *
 * Aparte de los partidos de la Ryder a propósito: «Mis próximos partidos» y
 * la precarga para anotar sin cobertura dan por hecha su forma (equipos,
 * rivales, su vista).
 */
class GetUpcomingTeeGroupsUseCase {
  #listUserCompetitionsUseCase;
  #getMyTeeGroupsUseCase;

  constructor({ listUserCompetitionsUseCase, getMyTeeGroupsUseCase }) {
    this.#listUserCompetitionsUseCase = listUserCompetitionsUseCase;
    this.#getMyTeeGroupsUseCase = getMyTeeGroupsUseCase;
  }

  /**
   * @param {string} userId
   * @param {Array} [competitions] - Las ya cargadas, para no pedirlas otra vez
   * @param {Date} [ahora]
   * @returns {Promise<{matches: Array, complete: boolean}>}
   */
  async executeWithCompleteness(userId, competitions = null, ahora = new Date()) {
    if (!userId) throw new Error('GetUpcomingTeeGroupsUseCase requires a userId');
    const todas = competitions ?? (await this.#listUserCompetitionsUseCase.execute(userId));
    const deStrokePlay = (todas || []).filter(
      (c) => c.hasTeams === false && COMPETICIONES_CON_PARTIDAS.includes(c.status)
    );
    // De hoy en adelante: una franja que nadie cerró sigue «en juego» días
    // después, y en el banner taparía lo de hoy (revisor)
    const hoy = fechaLocal(ahora);
    const leidas = await Promise.allSettled(
      deStrokePlay.map(async (c) => (await this.#partidasDe(c, userId)).filter((p) => p.roundDate >= hoy))
    );
    return {
      matches: leidas
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        // Por día y hora de salida: la hora ya ordena las franjas de un día
        .sort((a, b) => a.roundDate.localeCompare(b.roundDate) || (a.teeTime ?? '').localeCompare(b.teeTime ?? '')),
      complete: leidas.every((r) => r.status === 'fulfilled'),
    };
  }

  async #partidasDe(competicion, userId) {
    const mias = await this.#getMyTeeGroupsUseCase.execute(competicion.id);
    return mias
      .filter(({ group }) => POR_JUGAR.includes(group.status))
      // Si es no presentado, no juega: no es su próxima partida (revisor, 12 oct 2026)
      .filter(({ group }) => !esNoPresentado(group.players.find((p) => p.userId === userId)))
      .map(({ roundId, roundDate, sessionType, group }) => ({
        id: group.id,
        // Lo distingue de un partido de la Ryder: su pantalla y su vista son otras
        esPartidaDeFranja: true,
        status: group.status,
        competitionId: competicion.id,
        competitionName: competicion.name,
        // Para la etiqueta de su tarjeta (FE #845)
        tournamentType: competicion.tournamentType,
        roundId,
        roundDate,
        sessionType,
        teeTime: group.teeTime,
        matchNumber: group.number,
        // Sin los no presentados: siguen en la partida, pero no juegan (QA 2)
        partnerNames: companerosDe(group, userId).map((p) => p.name),
        // Le pasaron de otra para acompañar al que se quedó solo (BE #539)
        broughtIn: Boolean(group.players.find((p) => p.userId === userId)?.broughtIn),
      }));
  }
}

export default GetUpcomingTeeGroupsUseCase;
