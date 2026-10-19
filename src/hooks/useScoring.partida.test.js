import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `useScoring` con el origen de una partida de stroke play (FE #824, PR 7): la
 * misma maquinaria de la Ryder —cola antes de enviar, sondeo, vaciado— pero
 * con sus casos de uso y su tipo en la cola. La Ryder, sin origen, no cambia
 * (la cubre `useScoring.test.js`).
 */
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });

import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../composition', () => ({
  getScoringViewUseCase: { execute: vi.fn() },
  submitHoleScoreUseCase: { execute: vi.fn() },
  submitScorecardUseCase: { execute: vi.fn() },
  concedeMatchUseCase: { execute: vi.fn() },
  getTeeGroupScoringViewUseCase: { execute: vi.fn() },
  submitTeeGroupHoleScoreUseCase: { execute: vi.fn() },
  submitTeeGroupScorecardUseCase: { execute: vi.fn() },
}));

import {
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  getTeeGroupScoringViewUseCase,
  submitTeeGroupHoleScoreUseCase,
  submitTeeGroupScorecardUseCase,
} from '../composition';
import { useScoring } from './useScoring';
import { ORIGEN_PARTIDA_DE_FRANJA } from './origenesDeAnotacion';
import * as cola from '../utils/scoringOfflineQueue';
import TeeGroupScoringMapper from '../infrastructure/mappers/TeeGroupScoringMapper';

const hoyo = (hole, extra = {}) => ({
  hole, par: 4, strokes_received: 0, own_score: null, own_submitted: false,
  marker_score: null, marker_submitted: false, status: 'PENDING', ...extra,
});
const jugador = (userId, marks, holes) => ({
  user_id: userId, name: userId.toUpperCase(), playing_handicap: 10, tee_color: 'YELLOW', card_status: 'JUGANDO',
  marks_user_id: marks, marked_by_user_id: marks, holes, totals: { thru: 0, points: 0, gross_points: 0, gross: 0, net: 0, to_par_net: 0, to_par_gross: 0, complete: false },
});
const vista = (holesAna = Array.from({ length: 18 }, (_, i) => hoyo(i + 1))) =>
  TeeGroupScoringMapper.toScoringViewDTO({
    group_id: 'g-1', round_id: 'r-1', number: 2, tee_time: '08:10', status: 'IN_PROGRESS',
    scoring_opens_at: '2020-01-01T00:00:00Z', tournament_type: 'MEDAL', picked_up_allowed: false, i_mark_user_id: 'bea',
    players: [jugador('ana', 'bea', holesAna), jugador('bea', 'ana', Array.from({ length: 18 }, (_, i) => hoyo(i + 1)))],
  });

describe('useScoring con una partida de stroke play (FE #824, PR 7)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
    getTeeGroupScoringViewUseCase.execute.mockResolvedValue(vista());
    submitTeeGroupHoleScoreUseCase.execute.mockResolvedValue(vista());
  });

  it('lee su vista con sus casos de uso, no con los de la Ryder', async () => {
    const { result } = renderHook(() => useScoring('g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA));

    await waitFor(() => expect(result.current.scoringView?.matchId).toBe('g-1'));
    expect(getTeeGroupScoringViewUseCase.execute).toHaveBeenCalledWith('g-1');
    expect(getScoringViewUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.isMatchPlayer).toBe(true);
  });

  it('anotar guarda primero en la cola, con su tipo, y lo manda a su endpoint', async () => {
    let soltar;
    submitTeeGroupHoleScoreUseCase.execute.mockReturnValueOnce(new Promise((r) => (soltar = r)));
    const { result } = renderHook(() => useScoring('g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA));
    await waitFor(() => expect(result.current.scoringView?.matchId).toBe('g-1'));

    act(() => {
      result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'bea', markedScore: 4 });
    });
    await waitFor(() => expect(submitTeeGroupHoleScoreUseCase.execute).toHaveBeenCalled());

    // Con el envío en vuelo, ya está a salvo en el móvil y con su tipo
    expect(cola.getByMatch('g-1', 'ana')).toEqual([expect.objectContaining({ tipo: cola.TIPO_PARTIDA_DE_FRANJA, holeNumber: 1 })]);
    expect(submitTeeGroupHoleScoreUseCase.execute).toHaveBeenCalledWith('g-1', 1, { ownScore: 5, markedPlayerId: 'bea', markedScore: 4 });
    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();

    await act(async () => soltar(vista([hoyo(1, { own_score: 5, own_submitted: true }), ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))])));
    await waitFor(() => expect(cola.getByMatch('g-1', 'ana')).toHaveLength(0));
  });

  it('lo que quedó en la cola de esta partida lo vacía su pantalla por su endpoint', async () => {
    cola.enqueue('g-1', 4, { ownScore: 6, markedPlayerId: 'bea' }, null, 'ana', { tipo: cola.TIPO_PARTIDA_DE_FRANJA });

    renderHook(() => useScoring('g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA));

    await waitFor(() => expect(submitTeeGroupHoleScoreUseCase.execute).toHaveBeenCalledWith('g-1', 4, { ownScore: 6, markedPlayerId: 'bea' }));
    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('conceder no existe en stroke play: no hace nada ni rompe (revisor)', async () => {
    const { result } = renderHook(() => useScoring('g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA));
    await waitFor(() => expect(result.current.scoringView?.matchId).toBe('g-1'));

    await act(async () => result.current.concedeMatch('A', 'x'));

    expect(result.current.error).toBeNull();
  });

  it('entregar la tarjeta va por el suyo', async () => {
    const llena = Array.from({ length: 18 }, (_, i) => hoyo(i + 1, { own_score: 4, own_submitted: true, marker_score: 4, marker_submitted: true, status: 'MATCH' }));
    getTeeGroupScoringViewUseCase.execute.mockResolvedValue(vista(llena));
    submitTeeGroupScorecardUseCase.execute.mockResolvedValue(vista(llena));
    const { result } = renderHook(() => useScoring('g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA));
    await waitFor(() => expect(result.current.canSubmitScorecard).toBe(true));

    await act(async () => result.current.submitScorecard());

    expect(submitTeeGroupScorecardUseCase.execute).toHaveBeenCalledWith('g-1');
  });
});
