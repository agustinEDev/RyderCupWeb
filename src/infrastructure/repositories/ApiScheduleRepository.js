// src/infrastructure/repositories/ApiScheduleRepository.js

import { apiRequest } from '../../services/api';
import ScheduleMapper from '../mappers/ScheduleMapper';

/**
 * Implementacion REST del repositorio de Schedule.
 * Consume los 11 endpoints del backend Sprint 2.
 */
class ApiScheduleRepository {
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
   * POST /api/v1/competitions/rounds/{roundId}/matches/generate
   */
  async generateMatches(roundId, pairings) {
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/matches/generate`, {
      method: 'POST',
      body: JSON.stringify(pairings || {}),
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
