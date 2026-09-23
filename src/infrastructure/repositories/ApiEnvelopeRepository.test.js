import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from '../../services/api';
import ApiEnvelopeRepository from './ApiEnvelopeRepository';

/**
 * El repositorio de sobres (FE #655): a qué ruta se llama y con qué método.
 */
const VISTA = { round_id: 'r1', revealed: false, matchups: [] };

describe('ApiEnvelopeRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiEnvelopeRepository();
  });

  it('S1: entregar es un PUT con las filas en el cuerpo', async () => {
    apiRequest.mockResolvedValue({ round_id: 'r1', team: 'A', entries: [['ana']] });

    const sobre = await repo.submitEnvelope('r1', [['ana']]);

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/rounds/r1/envelope', {
      method: 'PUT',
      body: JSON.stringify({ entries: [['ana']] }),
    });
    expect(sobre.entries).toEqual([['ana']]);
  });

  it('S2: el equipo NO se manda: lo decide el servidor por quién firma', async () => {
    apiRequest.mockResolvedValue({ round_id: 'r1', team: 'A', entries: [['ana']] });

    await repo.submitEnvelope('r1', [['ana']]);

    expect(apiRequest.mock.calls[0][1].body).not.toContain('team');
  });

  it('S3: mirar es un GET', async () => {
    apiRequest.mockResolvedValue(VISTA);

    const vista = await repo.getEnvelopes('r1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/rounds/r1/envelopes');
    expect(vista.roundId).toBe('r1');
  });

  it('S4: un 404 al mirar NO se traga: esa sesión no existe', async () => {
    // Esta ruta no contesta 404 por «sin sobres» —devuelve la vista vacía—,
    // así que tragárselo escondía una sesión que no existe detrás de una
    // pantalla que parecía normal
    apiRequest.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    await expect(repo.getEnvelopes('r1')).rejects.toThrow('Not Found');
  });

  it('S5: cualquier otro error al mirar sí se propaga', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('Boom'), { status: 500 }));

    await expect(repo.getEnvelopes('r1')).rejects.toThrow('Boom');
  });

  it('S6: abrirlos es un POST sin cuerpo', async () => {
    apiRequest.mockResolvedValue({ round_id: 'r1', matchups: [], filled_automatically: ['B'] });

    const resultado = await repo.revealEnvelopes('r1');

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/competitions/rounds/r1/envelopes/reveal',
      { method: 'POST' }
    );
    expect(resultado.filledAutomatically).toEqual(['B']);
  });
});
