import { describe, it, expect, vi, beforeEach } from 'vitest';
import UndoTeamsUseCase from './UndoTeamsUseCase';

// Deshacer los equipos para que pueda entrar alguien (30 oct 2026)
describe('UndoTeamsUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    scheduleRepository = { undoTeams: vi.fn() };
    useCase = new UndoTeamsUseCase({ scheduleRepository });
  });

  it('los deshace en el servidor', async () => {
    scheduleRepository.undoTeams.mockResolvedValue(undefined);

    await useCase.execute('comp-1');

    expect(scheduleRepository.undoTeams).toHaveBeenCalledWith('comp-1');
  });

  it('sin competición no llama', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
    expect(scheduleRepository.undoTeams).not.toHaveBeenCalled();
  });

  it('el error del servidor sale tal cual, con su código', async () => {
    const fallo = Object.assign(new Error('x'), { status: 409, errorCode: 'TEAMS_LOCKED' });
    scheduleRepository.undoTeams.mockRejectedValue(fallo);

    await expect(useCase.execute('comp-1')).rejects.toBe(fallo);
  });
});
