// src/infrastructure/repositories/ApiEnvelopeRepository.js

import { apiRequest } from '../../services/api';
import EnvelopeMapper from '../mappers/EnvelopeMapper';
import IEnvelopeRepository from '../../domain/repositories/IEnvelopeRepository';

/**
 * Repositorio de sobres contra la API REST (FE #655).
 */
class ApiEnvelopeRepository extends IEnvelopeRepository {
  /**
   * PUT /api/v1/competitions/rounds/{roundId}/envelope
   *
   * El equipo no se manda: lo decide el servidor por quién firma la petición,
   * que si no se podría entregar el sobre del rival.
   */
  async submitEnvelope(roundId, entries) {
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/envelope`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
    return EnvelopeMapper.toEnvelopeDTO(data);
  }

  /**
   * GET /api/v1/competitions/rounds/{roundId}/envelopes
   *
   * El 404 no es un error: es una sesión sin sobres, y la pantalla pregunta
   * por ellos en cuanto se abre.
   */
  async getEnvelopes(roundId) {
    try {
      const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/envelopes`);
      return EnvelopeMapper.toEnvelopesViewDTO(data);
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  /**
   * POST /api/v1/competitions/rounds/{roundId}/envelopes/reveal
   */
  async revealEnvelopes(roundId) {
    const data = await apiRequest(
      `/api/v1/competitions/rounds/${roundId}/envelopes/reveal`,
      { method: 'POST' }
    );
    return {
      roundId: data.round_id,
      matchups: data.matchups || [],
      filledAutomatically: data.filled_automatically || [],
    };
  }
}

export default ApiEnvelopeRepository;
