import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateAndStartQuickMatchUseCase from './CreateAndStartQuickMatchUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

/**
 * Crear e iniciar una partida rápida en una sola petición (FE #848): el
 * asistente manda el borrador entero y recibe la partida ya en juego.
 */
const enJuego = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.inProgress(),
  participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Yo', handicap: 10, team: null, isGuest: false }],
  scorerIds: ['user-1'],
});

const peticion = (extra = {}) => ({
  quickMatchId: '6f1c2c1e-3a5b-4d6e-9f00-112233445566',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  scoringFormat: null,
  participants: [],
  scorerUserIds: ['user-1'],
  ...extra,
});

describe('CreateAndStartQuickMatchUseCase', () => {
  let repo;
  let useCase;

  beforeEach(() => {
    repo = { createAndStart: vi.fn().mockResolvedValue(enJuego) };
    useCase = new CreateAndStartQuickMatchUseCase({ quickMatchRepository: repo });
  });

  it('pide su repositorio', () => {
    expect(() => new CreateAndStartQuickMatchUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('manda el borrador y devuelve la partida en juego', async () => {
    const r = await useCase.execute(peticion());

    expect(repo.createAndStart).toHaveBeenCalledWith(peticion());
    expect(r.id).toBe('qm-1');
    expect(r.isInProgress).toBe(true);
  });

  it.each([
    ['sin id', { quickMatchId: '' }, 'quickMatchId is required'],
    ['sin campo', { golfCourseId: null }, 'golfCourseId is required'],
    ['sin anotadores', { scorerUserIds: [] }, 'scorerUserIds must contain 1 to 4 user ids'],
    ['cinco anotadores', { scorerUserIds: ['a', 'b', 'c', 'd', 'e'] }, 'scorerUserIds must contain 1 to 4 user ids'],
    ['los dos formatos', { matchFormat: 'SINGLES', scoringFormat: 'MEDAL' }, 'exactly one of matchFormat or scoringFormat'],
    ['ningún formato', { matchFormat: null, scoringFormat: null }, 'exactly one of matchFormat or scoringFormat'],
  ])('%s: no llama al servidor', async (_caso, extra, mensaje) => {
    await expect(useCase.execute(peticion(extra))).rejects.toThrow(mensaje);
    expect(repo.createAndStart).not.toHaveBeenCalled();
  });
});
