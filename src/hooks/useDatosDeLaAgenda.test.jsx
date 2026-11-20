import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('../utils/registraElFallo', () => ({ registraElFallo: vi.fn() }));

const mockDetalle = vi.fn();
const mockAgenda = vi.fn();
const mockInscripciones = vi.fn();

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getScheduleUseCase: { execute: (...a) => mockAgenda(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listEnrollmentsUseCase: { execute: (...a) => mockInscripciones(...a) },
}));

import customToast from '../utils/toast';
import { useDatosDeLaAgenda } from './useDatosDeLaAgenda';

const t = (clave) => clave;
const USER = { id: 'org' };
const navigate = vi.fn();

const INSCRITOS = [
  { userId: 'ana', userName: 'Ana', userHandicap: '12.4' },
  { userId: 'bea', userName: null, userHandicap: null },
];

const montar = () =>
  renderHook(() =>
    useDatosDeLaAgenda({ id: 'comp-1', user: USER, navigate, t }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockDetalle.mockResolvedValue({ id: 'comp-1', name: 'Ryder' });
  mockAgenda.mockResolvedValue({ rounds: [] });
  mockInscripciones.mockResolvedValue(INSCRITOS);
});

describe('useDatosDeLaAgenda', () => {
  it('carga todo y arma los mapas de nombres y hándicaps', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.competition).toEqual({ id: 'comp-1', name: 'Ryder' });
    expect(result.current.playerNameMap).toEqual(new Map([['ana', 'Ana']]));
    expect(result.current.playerHandicapMap).toEqual(new Map([['ana', 12.4]]));
    expect(result.current.inscritosSinCargar).toBe(false);
  });

  it('sin inscritos, un solo aviso con su id', async () => {
    mockInscripciones.mockRejectedValue(new Error('500'));
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.inscritosSinCargar).toBe(true);
    expect(customToast.error).toHaveBeenCalledWith(
      'errors.failedToLoadEnrollments',
      { id: 'inscritos-sin-cargar' },
    );
  });

  it('si la competición no carga, a la ficha', async () => {
    mockDetalle.mockRejectedValue(new Error('404'));
    montar();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/competitions/comp-1'),
    );
    expect(customToast.error).toHaveBeenCalledWith(
      'errors.failedToLoadSchedule',
    );
  });

  it('tras una generación bloqueada, recarga y quita el aviso de inscritos', async () => {
    mockInscripciones.mockRejectedValueOnce(new Error('500'));
    const { result } = montar();
    await waitFor(() => expect(result.current.inscritosSinCargar).toBe(true));
    customToast.dismiss.mockClear();
    mockAgenda.mockResolvedValue({ rounds: [{ id: 'r1' }] });

    await act(() => result.current.recargarTrasGeneracionBloqueada());

    expect(result.current.schedule).toEqual({ rounds: [{ id: 'r1' }] });
    expect(result.current.inscritosSinCargar).toBe(false);
    expect(customToast.dismiss).toHaveBeenCalledWith('inscritos-sin-cargar');
  });

  it('si esa recarga falla, el fallo sale hacia quien la pidió', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockAgenda.mockRejectedValue(new Error('sin red'));

    await expect(
      act(() => result.current.recargarTrasGeneracionBloqueada()),
    ).rejects.toThrow('sin red');
  });

  it('al salir, el aviso de inscritos se va con la agenda', async () => {
    const { result, unmount } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    customToast.dismiss.mockClear();

    unmount();

    expect(customToast.dismiss).toHaveBeenCalledWith('inscritos-sin-cargar');
  });
});
