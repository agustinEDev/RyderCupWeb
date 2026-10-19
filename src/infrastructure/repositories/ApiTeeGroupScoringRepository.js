// src/infrastructure/repositories/ApiTeeGroupScoringRepository.js

import apiRequest from '../../services/api.js';
import ITeeGroupScoringRepository from '../../domain/repositories/ITeeGroupScoringRepository.js';
import TeeGroupScoringMapper from '../mappers/TeeGroupScoringMapper';
import ScheduleMapper from '../mappers/ScheduleMapper';
import { TOPE_DE_ANOTAR_MS } from './topeDeAnotar';

const BASE = '/api/v1/competitions';

/**
 * Anotar las partidas de stroke play (FE #824, PR 7; RyderCupAm#535). Todo lo
 * de una partida contesta con su vista.
 */
class ApiTeeGroupScoringRepository extends ITeeGroupScoringRepository {
  async getScoringView(groupId) {
    return TeeGroupScoringMapper.toScoringViewDTO(await apiRequest(`${BASE}/groups/${groupId}/scoring-view`));
  }

  /**
   * El cuerpo de la Ryder. Lo que no viene no se manda (`JSON.stringify` tira
   * los `undefined`): omitirlo deja ese golpe como estaba, y nulo es recogida.
   */
  async submitHoleScore(groupId, holeNumber, scoreData) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/scores/holes/${holeNumber}`, {
      topeMs: TOPE_DE_ANOTAR_MS,
      method: 'POST',
      body: JSON.stringify({
        own_score: scoreData.ownScore,
        marked_player_id: scoreData.markedPlayerId,
        marked_score: scoreData.markedScore,
      }),
    });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  async submitScorecard(groupId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/scorecard`, { topeMs: TOPE_DE_ANOTAR_MS, method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  async retire(groupId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/scorecard/retire`, { method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  /** El organizador: el lado del jugador, el del marcador o los dos. */
  async correctHole(groupId, userId, holeNumber, { ownScore, markerScore }) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/holes/${holeNumber}`, {
      method: 'PUT',
      body: JSON.stringify({ own_score: ownScore, marker_score: markerScore }),
    });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  async reopenCard(groupId, userId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/reopen`, { method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  async markNoShow(groupId, userId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/no-show`, { method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  /** El organizador retira a quien ya jugó (RyderCupAm#553). */
  async retirePlayer(groupId, userId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/retire`, { method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  /** Borra lo anotado en un hoyo: `own`, `marker` o `both` (RyderCupAm#553). */
  async deleteHole(groupId, userId, holeNumber, side) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/holes/${holeNumber}?side=${side}`, { method: 'DELETE' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  /** Valida de una vez lo anotado por quien juega sin marcador (BE #539). */
  async validateScored(groupId, userId) {
    const data = await apiRequest(`${BASE}/groups/${groupId}/players/${userId}/validate-scored`, { method: 'POST' });
    return TeeGroupScoringMapper.toScoringViewDTO(data);
  }

  /** Cierra las partidas sin acabar de la franja: contesta con sus partidas. */
  async closeWindow(roundId) {
    return ScheduleMapper.toTeeGroupsDTO(await apiRequest(`${BASE}/rounds/${roundId}/groups/close`, { method: 'POST' }));
  }

  async getWindowStandings(roundId, category) {
    const filtro = category != null ? `?category=${encodeURIComponent(category)}` : '';
    return TeeGroupScoringMapper.toStandingsDTO(await apiRequest(`${BASE}/rounds/${roundId}/standings${filtro}`));
  }

  /** La general de la competición, con su regla (PR 8). */
  async getCompetitionStandings(competitionId, category) {
    const filtro = category != null ? `?category=${encodeURIComponent(category)}` : '';
    return TeeGroupScoringMapper.toStandingsDTO(await apiRequest(`${BASE}/${competitionId}/standings${filtro}`));
  }

  /** La scratch: sin categorías, hasta el 25.º y empatados; `me` si quien mira queda fuera (PR 8). */
  async getScratchStandings(competitionId) {
    return TeeGroupScoringMapper.toStandingsDTO(await apiRequest(`${BASE}/${competitionId}/standings/scratch`));
  }
}

export default ApiTeeGroupScoringRepository;
