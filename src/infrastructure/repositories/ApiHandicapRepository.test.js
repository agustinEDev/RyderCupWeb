import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiHandicapRepository from './ApiHandicapRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

/**
 * El refresco del hándicap propio (FE #677). El login ya no lo hace: esperaba a
 * la RFEG antes de contestar (RyderCupAM#340). Ahora se pide aparte.
 */
describe('ApiHandicapRepository · refreshMine (FE #677)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R1: pide el refresco del hándicap propio y traduce la respuesta', async () => {
    apiModule.default.mockResolvedValue({ needs_handicap: true, handicap: 18 });

    const resultado = await new ApiHandicapRepository().refreshMine();

    expect(apiModule.default).toHaveBeenCalledWith('/api/v1/handicaps/refresh-mine', {
      method: 'POST',
    });
    expect(resultado).toEqual({ needsHandicap: true, handicap: 18 });
  });

  it('R1b: sin hándicap guardado llega null, no undefined', async () => {
    apiModule.default.mockResolvedValue({ needs_handicap: true });

    const resultado = await new ApiHandicapRepository().refreshMine();

    expect(resultado).toEqual({ needsHandicap: true, handicap: null });
  });
});
