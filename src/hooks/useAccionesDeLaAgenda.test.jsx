import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('../utils/registraElFallo', () => ({ registraElFallo: vi.fn() }));

const mockEstado = vi.fn();
const mockGenerar = vi.fn();
const mockRepartir = vi.fn();
const mockDeshacer = vi.fn();

vi.mock('../composition', () => ({
  generateMatchesUseCase: { execute: (...a) => mockGenerar(...a) },
  assignTeamsUseCase: { execute: (...a) => mockRepartir(...a) },
  undoTeamsUseCase: { execute: (...a) => mockDeshacer(...a) },
  fillCaptainUseCase: { execute: vi.fn() },
  updateMatchStatusUseCase: { execute: (...a) => mockEstado(...a) },
  declareWalkoverUseCase: { execute: vi.fn() },
  reassignPlayersUseCase: { execute: vi.fn() },
  resetEnvelopesUseCase: { execute: vi.fn() },
}));

import customToast from '../utils/toast';
import { registraElFallo } from '../utils/registraElFallo';
import { useAccionesDeLaAgenda } from './useAccionesDeLaAgenda';

const t = (clave) => clave;

const montar = () => {
  const orden = [];
  const datos = {
    setCompetition: vi.fn(),
    recargarTodo: vi.fn(),
    recargarCompeticion: vi.fn(async () => orden.push('competicion')),
    reloadSchedule: vi.fn(async () => orden.push('agenda')),
    recargarTrasGeneracionBloqueada: vi.fn(),
  };
  const modales = {
    cerrarGenerar: vi.fn(),
    setShowTeamsModal: vi.fn(),
    setDeshaciendoEquipos: vi.fn(() => orden.push('cerrar-confirmacion')),
  };
  const hook = renderHook(() =>
    useAccionesDeLaAgenda({ id: 'comp-1', t, tComp: t, datos, modales }),
  );
  return { hook, datos, modales, orden };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAccionesDeLaAgenda · empezar y terminar un partido', () => {
  /*
   *   acción    | llamada    | clave del fallo
   *   ----------|------------|-------------------------------------
   *   empezar   | 'start'    | SchedulePage.error-starting-match
   *   terminar  | 'complete' | SchedulePage.error-completing-match
   */
  it.each([
    [
      'handleStartMatch',
      'start',
      'SchedulePage.error-starting-match',
      'Error starting match:',
    ],
    [
      'handleCompleteMatch',
      'complete',
      'SchedulePage.error-completing-match',
      'Error completing match:',
    ],
  ])(
    '%s pide %s y, si falla, lo apunta con su clave',
    async (manejador, accion, clave, mensaje) => {
      const fallo = new Error('500');
      mockEstado.mockRejectedValue(fallo);
      const { hook } = montar();

      await act(() => hook.result.current[manejador]('m1'));

      expect(mockEstado).toHaveBeenCalledWith('m1', accion);
      expect(registraElFallo).toHaveBeenCalledWith(clave, mensaje, fallo);
      expect(customToast.error).toHaveBeenCalledWith(
        'errors.failedToUpdateMatchStatus',
      );
      expect(hook.result.current.isProcessing).toBe(false);
    },
  );

  it('bien, avisa y recarga la agenda', async () => {
    mockEstado.mockResolvedValue({});
    const { hook, datos } = montar();

    await act(() => hook.result.current.handleCompleteMatch('m2'));

    expect(mockEstado).toHaveBeenCalledWith('m2', 'complete');
    expect(customToast.success).toHaveBeenCalledWith(
      'success.matchStatusUpdated',
    );
    expect(datos.reloadSchedule).toHaveBeenCalled();
    expect(registraElFallo).not.toHaveBeenCalled();
  });
});

describe('useAccionesDeLaAgenda · generar bloqueado', () => {
  it('recarga todo y no enseña la frase del servidor', async () => {
    mockGenerar.mockRejectedValue({
      errorCode: 'MATCH_GENERATION_BLOCKED',
      message: 'Falta Luis',
    });
    const { hook, datos, modales } = montar();

    await act(() => hook.result.current.handleGenerateMatches('r1'));

    expect(datos.recargarTrasGeneracionBloqueada).toHaveBeenCalled();
    expect(modales.cerrarGenerar).not.toHaveBeenCalled();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('si la recarga falla, lo apunta y enseña la frase del servidor', async () => {
    const fallo = Object.assign(new Error('Falta Luis'), {
      status: 409,
      errorCode: 'MATCH_GENERATION_BLOCKED',
    });
    const recarga = new Error('sin red');
    mockGenerar.mockRejectedValue(fallo);
    const { hook, datos } = montar();
    datos.recargarTrasGeneracionBloqueada.mockRejectedValue(recarga);

    await act(() => hook.result.current.handleGenerateMatches('r1'));

    expect(registraElFallo).toHaveBeenCalledWith(
      'SchedulePage.reloading-after-a-blocked-generation',
      'Error reloading after a blocked generation:',
      recarga,
    );
    expect(customToast.error).toHaveBeenCalledWith('Falta Luis');
  });

  it('con emparejamientos a mano, los manda; bien, cierra y recarga', async () => {
    mockGenerar.mockResolvedValue({});
    const { hook, datos, modales } = montar();

    await act(() => hook.result.current.handleGenerateMatches('r1', ['p']));

    expect(mockGenerar).toHaveBeenCalledWith('r1', { manualPairings: ['p'] });
    expect(modales.cerrarGenerar).toHaveBeenCalled();
    expect(datos.reloadSchedule).toHaveBeenCalled();
  });
});

/**
 * D11: un emparejado a mano fuera de su equipo (RyderCupAm #919) tiene su
 * texto, no la frase del servidor.
 */
describe('useAccionesDeLaAgenda · generar con un emparejado fuera de su equipo', () => {
  it('PAIRING_PLAYER_NOT_IN_TEAM: su texto, sin cerrar el modal', async () => {
    mockGenerar.mockRejectedValue(
      Object.assign(new Error('Player p9 is not on any team'), {
        status: 422,
        errorCode: 'PAIRING_PLAYER_NOT_IN_TEAM',
      }),
    );
    const { hook, modales } = montar();
    await act(() =>
      hook.result.current.handleGenerateMatches('r1', [{ a: 1 }]),
    );
    expect(customToast.error).toHaveBeenCalledWith(
      'errors.PAIRING_PLAYER_NOT_IN_TEAM',
    );
    expect(modales.cerrarGenerar).not.toHaveBeenCalled();
  });
});

describe('useAccionesDeLaAgenda · repartir equipos', () => {
  it.each([
    ['DRAFT_IN_PROGRESS', 'errors.waitForDraft', false],
    ['TEAMS_FORMED', 'errors.teamsFormed', true],
  ])('%s → %s (recarga: %s)', async (errorCode, aviso, recarga) => {
    mockRepartir.mockRejectedValue({ errorCode });
    const { hook, datos, modales } = montar();

    await act(() => hook.result.current.handleAssignTeams({}));

    expect(customToast.error).toHaveBeenCalledWith(aviso);
    expect(modales.setShowTeamsModal).toHaveBeenCalledTimes(recarga ? 1 : 0);
    expect(datos.reloadSchedule).toHaveBeenCalledTimes(recarga ? 1 : 0);
    expect(datos.recargarCompeticion).toHaveBeenCalledTimes(recarga ? 1 : 0);
  });
});

describe('useAccionesDeLaAgenda · deshacer equipos', () => {
  it('cierra la confirmación, recarga y solo entonces deja de procesar', async () => {
    mockDeshacer.mockRejectedValue({ errorCode: 'NO_TEAMS' });
    const { hook, orden } = montar();

    await act(() => hook.result.current.handleUndoTeams());

    expect(orden).toEqual(['cerrar-confirmacion', 'agenda', 'competicion']);
    // Ya deshechos: basta con releer, sin aviso
    expect(customToast.error).not.toHaveBeenCalled();
    expect(hook.result.current.isProcessing).toBe(false);
  });

  it('con TEAMS_LOCKED, su aviso', async () => {
    mockDeshacer.mockRejectedValue({ errorCode: 'TEAMS_LOCKED' });
    const { hook } = montar();

    await act(() => hook.result.current.handleUndoTeams());

    expect(customToast.error).toHaveBeenCalledWith('errors.teamsLocked');
  });
});
