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
  async submitEnvelope(roundId, entries, revealWhenBothReady = false) {
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/envelope`, {
      method: 'PUT',
      body: JSON.stringify({ entries, reveal_when_both_ready: revealWhenBothReady }),
    });
    return EnvelopeMapper.toEnvelopeDTO(data);
  }

  /**
   * GET /api/v1/competitions/rounds/{roundId}/envelopes
   *
   * Una sesión sin sobres devuelve la vista vacía, no un 404: el 404 significa
   * que la sesión no existe, y tragárselo escondía eso detrás de una pantalla
   * con aspecto de normal.
   */
  async getEnvelopes(roundId) {
    const data = await apiRequest(`/api/v1/competitions/rounds/${roundId}/envelopes`);
    return EnvelopeMapper.toEnvelopesViewDTO(data);
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

  /**
   * POST /api/v1/competitions/rounds/{roundId}/envelopes/reset
   *
   * Solo el organizador, y solo mientras no se haya jugado nada de la sesión.
   */
  async resetEnvelopes(roundId) {
    const data = await apiRequest(
      `/api/v1/competitions/rounds/${roundId}/envelopes/reset`,
      { method: 'POST' }
    );
    return {
      roundId: data.round_id,
      envelopesRemoved: data.envelopes_removed ?? 0,
      matchesRemoved: data.matches_removed ?? 0,
    };
  }

  /**
   * GET /api/v1/competitions/me/pending-envelopes
   *
   * Vacío para quien no capitanea nada, que es casi todo el mundo.
   */
  async listMyPendingEnvelopes() {
    const data = await apiRequest('/api/v1/competitions/me/pending-envelopes');
    return EnvelopeMapper.toPendingEnvelopes(data);
  }

  /**
   * GET /api/v1/competitions/me/sessions-without-matches (BE #361)
   *
   * Las sesiones de las competiciones que organizo que se abrieron sin poder
   * crear sus partidos. Vacío casi siempre.
   */
  async listMySessionsWithoutMatches() {
    const data = await apiRequest('/api/v1/competitions/me/sessions-without-matches');
    return EnvelopeMapper.toSessionsWithoutMatches(data);
  }
}

export default ApiEnvelopeRepository;
