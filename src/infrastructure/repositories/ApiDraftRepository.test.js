import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from '../../services/api';
import ApiDraftRepository from './ApiDraftRepository';

/**
 * El repositorio de la sala (FE #653).
 *
 * Lo que se comprueba aquí es lo que un test de pantalla no ve: a qué ruta se
 * llama, con qué método, y que un 404 al mirar significa «todavía no se ha
 * sorteado» y no un error que tumbe la pantalla.
 */
const RESPUESTA = { id: 's1', competition_id: 'c1', status: 'IN_PROGRESS', available_players: [] };

describe('ApiDraftRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiDraftRepository();
  });

  it('R1: abrir la sala es un POST a /draft', async () => {
    apiRequest.mockResolvedValue(RESPUESTA);

    const sala = await repo.startDraft('c1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/c1/draft', { method: 'POST' });
    expect(sala.status).toBe('IN_PROGRESS');
  });

  it('R2: mirarla es un GET, y devuelve la sala mapeada', async () => {
    apiRequest.mockResolvedValue(RESPUESTA);

    const sala = await repo.getDraft('c1');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/c1/draft');
    expect(sala.competitionId).toBe('c1');
  });

  it('R3: un 404 al mirar es «todavía no hay sala», no un error', async () => {
    // La ficha pregunta por la sala en cuanto se abre: sin esto, toda
    // competición sin draft pintaría un error
    apiRequest.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    expect(await repo.getDraft('c1')).toBeNull();
  });

  it('R4: cualquier otro error al mirar sí se propaga', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('Boom'), { status: 500 }));

    await expect(repo.getDraft('c1')).rejects.toThrow('Boom');
  });

  it('R5: elegir es un POST con el jugador en el cuerpo', async () => {
    apiRequest.mockResolvedValue(RESPUESTA);

    await repo.makePick('c1', 'dani');

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/c1/draft/picks', {
      method: 'POST',
      body: JSON.stringify({ player_id: 'dani' }),
    });
  });
});
