// src/infrastructure/repositories/ApiScheduleRepository.js

import apiRequest from '../../services/api.js';
import IScheduleRepository from '../../domain/repositories/IScheduleRepository.js';
import ScheduleMapper from '../mappers/ScheduleMapper';

/**
 * Implementacion REST del repositorio de Schedule.
 * Consume los 11 endpoints del backend Sprint 2.
 */
class ApiScheduleRepository extends IScheduleRepository {
  /**
   * GET /api/v1/competitions/{competitionId}/schedule
   */
  async getSchedule(competitionId) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/schedule`);
    return ScheduleMapper.toScheduleDTO(data);
  }

  /**
   * POST /api/v1/competitions/{competitionId}/schedule/configure
   */
  async configureSchedule(competitionId, config) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/schedule/configure`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return data;
  }

  /**
   * POST /api/v1/competitions/{competitionId}/teams
   */
  async assignTeams(competitionId, teamData) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/teams`, {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
    return ScheduleMapper.toTeamAssignmentDTO(data);
  }

  /**
   * POST /api/v1/competitions/{competitionId}/rounds
   */
  async createRound(competitionId, roundData) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(roundData),
    });
    return ScheduleMapper.toRoundDTO(data);
  }

  /**
   * PUT /api/v1/competitions/rounds/{roundId}
   */
  async updateRound(roundId, roundData) {
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}`, {
      method: 'PUT',
      body: JSON.stringify(roundData),
    });
    return ScheduleMapper.toRoundDTO(data);
  }

  /**
   * DELETE /api/v1/competitions/rounds/{roundId}
   */
  async deleteRound(roundId) {
    await apiRequest(`/api/v1/competitions/rounds/${roundId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Plaza en una franja de stroke play (FE #824, RyderCupAm#511). Sin
   * `userId`, para uno mismo; con él, el organizador coloca a otro. Con
   * `insteadOfRoundId`, se cambia desde esa en un solo paso.
   * POST /api/v1/competitions/rounds/{roundId}/places
   */
  async takePlace(roundId, { userId, insteadOfRoundId } = {}) {
    return apiRequest(`/api/v1/competitions/rounds/${roundId}/places`, {
      method: 'POST',
      body: JSON.stringify({
        ...(userId ? { user_id: userId } : {}),
        ...(insteadOfRoundId ? { instead_of_round_id: insteadOfRoundId } : {}),
      }),
    });
  }

  /** DELETE /api/v1/competitions/rounds/{roundId}/places/{userId} */
  async releasePlace(roundId, userId) {
    await apiRequest(`/api/v1/competitions/rounds/${roundId}/places/${userId}`, { method: 'DELETE' });
  }

  /** Esperar en una franja llena, uno mismo (RyderCupAm#512). */
  async joinWaitingList(roundId) {
    return apiRequest(`/api/v1/competitions/rounds/${roundId}/waiting-list`, { method: 'POST' });
  }

  /** DELETE /api/v1/competitions/rounds/{roundId}/waiting-list/{userId} */
  async leaveWaitingList(roundId, userId) {
    await apiRequest(`/api/v1/competitions/rounds/${roundId}/waiting-list/${userId}`, { method: 'DELETE' });
  }

  /** Las plazas que me asignaron desde la espera y aún no he visto. */
  async getMyAssignedPlaces() {
    const data = await apiRequest('/api/v1/competitions/me/assigned-places');
    return (data || []).map((p) => ({
      competitionId: p.competition_id,
      competitionName: p.competition_name,
      roundId: p.round_id,
      roundDate: p.round_date,
      sessionType: p.session_type,
      firstTeeTime: typeof p.first_tee_time === 'string' ? p.first_tee_time.slice(0, 5) : p.first_tee_time,
      assignedAt: p.assigned_at,
    }));
  }

  /** «Entendido»: ya la he visto. */
  async acknowledgeAssignedPlace(roundId) {
    await apiRequest(`/api/v1/competitions/me/assigned-places/${roundId}/acknowledge`, { method: 'POST' });
  }

  /**
   * POST /api/v1/competitions/rounds/{roundId}/matches/generate
   */
  async generateMatches(roundId, pairings) {
    const body = pairings?.manualPairings
      ? {
        manual_pairings: pairings.manualPairings.map(m => ({
          team_a_player_ids: m.teamAPlayerIds,
          team_b_player_ids: m.teamBPlayerIds,
        })),
      }
      : {};
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/matches/generate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data;
  }

  /**
   * GET /api/v1/competitions/matches/{matchId}
   */
  async getMatchDetail(matchId) {
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}`);
    return ScheduleMapper.toMatchDTO(data);
  }

  /**
   * PUT /api/v1/competitions/matches/{matchId}/status
   */
  async updateMatchStatus(matchId, action, result) {
    const body = { action };
    if (result) {
      body.result = result;
    }
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return data;
  }

  /**
   * POST /api/v1/competitions/matches/{matchId}/walkover
   */
  async declareWalkover(matchId, winningTeam, reason) {
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/walkover`, {
      method: 'POST',
      body: JSON.stringify({
        winning_team: winningTeam,
        reason,
      }),
    });
    return data;
  }

  /**
   * PUT /api/v1/competitions/matches/{matchId}/players
   */
  async reassignPlayers(matchId, teamAIds, teamBIds) {
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/players`, {
      method: 'PUT',
      body: JSON.stringify({
        team_a_player_ids: teamAIds,
        team_b_player_ids: teamBIds,
      }),
    });
    return data;
  }
}

export default ApiScheduleRepository;
