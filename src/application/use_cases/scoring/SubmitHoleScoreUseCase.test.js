import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitHoleScoreUseCase from './SubmitHoleScoreUseCase';

describe('SubmitHoleScoreUseCase', () => {
  let scoringRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scoringRepository = { submitHoleScore: vi.fn() };
    useCase = new SubmitHoleScoreUseCase({ scoringRepository });
  });

  it('should submit valid score data', async () => {
    const mockView = { matchId: 'm-1', matchStatus: 'IN_PROGRESS' };
    scoringRepository.submitHoleScore.mockResolvedValue(mockView);

    const scoreData = { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 };
    const result = await useCase.execute('m-1', 3, scoreData);

    expect(scoringRepository.submitHoleScore).toHaveBeenCalledWith('m-1', 3, {
      ownScore: 5,
      markedPlayerId: 'u2',
      markedScore: 4,
    });
    expect(result).toEqual(mockView);
  });

  it('should accept null scores (picked up ball)', async () => {
    scoringRepository.submitHoleScore.mockResolvedValue({});

    const scoreData = { ownScore: null, markedPlayerId: 'u2', markedScore: null };
    await useCase.execute('m-1', 1, scoreData);

    expect(scoringRepository.submitHoleScore).toHaveBeenCalledWith('m-1', 1, {
      ownScore: null,
      markedPlayerId: 'u2',
      markedScore: null,
    });
  });

  // Omitir un golpe NO es lo mismo que mandarlo nulo (#609): nulo es una raya
  // —conceder el hoyo, en match play—, y la casilla que el jugador no ha tocado
  // llega como `undefined`. Mandarla como nula concedia el hoyo del otro
  it('no manda el golpe del marcado cuando no se ha anotado', async () => {
    scoringRepository.submitHoleScore.mockResolvedValue({});

    const scoreData = { ownScore: 4, markedPlayerId: 'u2', markedScore: undefined };
    await useCase.execute('m-1', 1, scoreData);

    const enviado = scoringRepository.submitHoleScore.mock.calls[0][2];
    expect('markedScore' in enviado).toBe(false);
    expect(enviado).toEqual({ ownScore: 4, markedPlayerId: 'u2' });
  });

  it('no manda el golpe propio cuando no se ha anotado', async () => {
    scoringRepository.submitHoleScore.mockResolvedValue({});

    const scoreData = { ownScore: undefined, markedPlayerId: 'u2', markedScore: 5 };
    await useCase.execute('m-1', 1, scoreData);

    const enviado = scoringRepository.submitHoleScore.mock.calls[0][2];
    expect('ownScore' in enviado).toBe(false);
    expect(enviado).toEqual({ markedPlayerId: 'u2', markedScore: 5 });
  });

  it('pero una raya propia con el marcado sin anotar sigue mandando la raya', async () => {
    scoringRepository.submitHoleScore.mockResolvedValue({});

    const scoreData = { ownScore: null, markedPlayerId: 'u2', markedScore: undefined };
    await useCase.execute('m-1', 1, scoreData);

    expect(scoringRepository.submitHoleScore).toHaveBeenCalledWith('m-1', 1, {
      ownScore: null,
      markedPlayerId: 'u2',
    });
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('', 1, {})).rejects.toThrow('Match ID is required');
  });

  it('should throw if holeNumber is 0', async () => {
    await expect(useCase.execute('m-1', 0, {})).rejects.toThrow('Hole number must be between 1 and 18');
  });

  it('should throw if holeNumber is 19', async () => {
    await expect(useCase.execute('m-1', 19, {})).rejects.toThrow('Hole number must be between 1 and 18');
  });

  it('should throw if holeNumber is negative', async () => {
    await expect(useCase.execute('m-1', -1, {})).rejects.toThrow('Hole number must be between 1 and 18');
  });

  it('should throw if scoreData is missing', async () => {
    await expect(useCase.execute('m-1', 1, null)).rejects.toThrow('Score data is required');
  });

  it('should throw if markedPlayerId is missing', async () => {
    const scoreData = { ownScore: 5, markedScore: 4 };
    await expect(useCase.execute('m-1', 1, scoreData)).rejects.toThrow('Marked player ID is required');
  });

  it('should throw for invalid own score (out of range)', async () => {
    const scoreData = { ownScore: 10, markedPlayerId: 'u2', markedScore: 4 };
    await expect(useCase.execute('m-1', 1, scoreData)).rejects.toThrow('Invalid HoleScore: 10');
  });

  it('should throw for invalid marked score (out of range)', async () => {
    const scoreData = { ownScore: 5, markedPlayerId: 'u2', markedScore: 0 };
    await expect(useCase.execute('m-1', 1, scoreData)).rejects.toThrow('Invalid HoleScore: 0');
  });

  it('should propagate repository errors', async () => {
    scoringRepository.submitHoleScore.mockRejectedValue(new Error('Conflict'));

    const scoreData = { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 };
    await expect(useCase.execute('m-1', 1, scoreData)).rejects.toThrow('Conflict');
  });

  it('should not call repository when validation fails', async () => {
    await expect(useCase.execute('', 1, {})).rejects.toThrow();
    expect(scoringRepository.submitHoleScore).not.toHaveBeenCalled();
  });
});
