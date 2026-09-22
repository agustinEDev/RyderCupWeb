// src/infrastructure/repositories/ApiDraftRepository.js

import { apiRequest } from '../../services/api';
import DraftMapper from '../mappers/DraftMapper';
import IDraftRepository from '../../domain/repositories/IDraftRepository';

/**
 * Repositorio de la sala de draft contra la API REST (FE #653).
 */
class ApiDraftRepository extends IDraftRepository {
  /**
   * POST /api/v1/competitions/{competitionId}/draft
   */
  async startDraft(competitionId) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/draft`, {
      method: 'POST',
    });
    return DraftMapper.toDraftDTO(data);
  }

  /**
   * GET /api/v1/competitions/{competitionId}/draft
   *
   * El 404 no es un error: es que todavía no se ha lanzado el sorteo, y la
   * ficha pregunta por la sala en cuanto se abre.
   */
  async getDraft(competitionId) {
    try {
      const data = await apiRequest(`/api/v1/competitions/${competitionId}/draft`);
      return DraftMapper.toDraftDTO(data);
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  /**
   * POST /api/v1/competitions/{competitionId}/draft/picks
   */
  async makePick(competitionId, playerId) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/draft/picks`, {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });
    return DraftMapper.toDraftDTO(data);
  }
}

export default ApiDraftRepository;
