import { describe, it, expect, vi } from 'vitest';
import RetireFromTeeGroupUseCase from './RetireFromTeeGroupUseCase';
import CorrectTeeGroupHoleUseCase from './CorrectTeeGroupHoleUseCase';
import ReopenTeeGroupCardUseCase from './ReopenTeeGroupCardUseCase';
import MarkTeeGroupNoShowUseCase from './MarkTeeGroupNoShowUseCase';
import CloseTeeWindowUseCase from './CloseTeeWindowUseCase';
import GetTeeWindowStandingsUseCase from './GetTeeWindowStandingsUseCase';

/** Anotar partidas (FE #824, PR 7): cada caso pasa al repositorio y no llama sin lo que necesita. */
const repo = () => ({
  retire: vi.fn().mockResolvedValue({}),
  correctHole: vi.fn().mockResolvedValue({}),
  reopenCard: vi.fn().mockResolvedValue({}),
  markNoShow: vi.fn().mockResolvedValue({}),
  closeWindow: vi.fn().mockResolvedValue({}),
  getWindowStandings: vi.fn().mockResolvedValue({}),
});
const con = (Clase, r) => new Clase({ teeGroupScoringRepository: r });

describe('Anotar partidas · casos de uso (FE #824, PR 7)', () => {
  it('pasan sus datos', async () => {
    const r = repo();

    await con(RetireFromTeeGroupUseCase, r).execute('g-1');
    await con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 7, { ownScore: 5 });
    await con(ReopenTeeGroupCardUseCase, r).execute('g-1', 'ana');
    await con(MarkTeeGroupNoShowUseCase, r).execute('g-1', 'ana');
    await con(CloseTeeWindowUseCase, r).execute('r-1');
    await con(GetTeeWindowStandingsUseCase, r).execute('r-1', 2);

    expect(r.retire).toHaveBeenCalledWith('g-1');
    expect(r.correctHole).toHaveBeenCalledWith('g-1', 'ana', 7, { ownScore: 5 });
    expect(r.reopenCard).toHaveBeenCalledWith('g-1', 'ana');
    expect(r.markNoShow).toHaveBeenCalledWith('g-1', 'ana');
    expect(r.closeWindow).toHaveBeenCalledWith('r-1');
    expect(r.getWindowStandings).toHaveBeenCalledWith('r-1', 2);
  });

  it('corregir: solo los lados que vienen; nulo es recogida y se manda', async () => {
    const r = repo();

    await con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 7, { ownScore: null, markerScore: undefined });

    expect(r.correctHole).toHaveBeenCalledWith('g-1', 'ana', 7, { ownScore: null });
  });

  it.each([
    ['retirarse sin partida', (r) => con(RetireFromTeeGroupUseCase, r).execute(''), 'retire'],
    ['corregir sin jugador', (r) => con(CorrectTeeGroupHoleUseCase, r).execute('g-1', '', 7, { ownScore: 5 }), 'correctHole'],
    ['corregir el hoyo 0', (r) => con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 0, { ownScore: 5 }), 'correctHole'],
    ['corregir el hoyo 19', (r) => con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 19, { ownScore: 5 }), 'correctHole'],
    ['corregir sin ningún lado', (r) => con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 7, {}), 'correctHole'],
    ['corregir con 16 golpes', (r) => con(CorrectTeeGroupHoleUseCase, r).execute('g-1', 'ana', 7, { ownScore: 16 }), 'correctHole'],
    ['reabrir sin jugador', (r) => con(ReopenTeeGroupCardUseCase, r).execute('g-1', ''), 'reopenCard'],
    ['no presentado sin partida', (r) => con(MarkTeeGroupNoShowUseCase, r).execute('', 'ana'), 'markNoShow'],
    ['cerrar sin franja', (r) => con(CloseTeeWindowUseCase, r).execute(''), 'closeWindow'],
    ['clasificación sin franja', (r) => con(GetTeeWindowStandingsUseCase, r).execute(''), 'getWindowStandings'],
  ])('%s: no llama', async (_caso, ejecutar, metodo) => {
    const r = repo();

    await expect(ejecutar(r)).rejects.toThrow();
    expect(r[metodo]).not.toHaveBeenCalled();
  });
});
