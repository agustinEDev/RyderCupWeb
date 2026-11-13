import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * La carga de la ficha cuando cambia el :id sin desmontar la página (atrás y
 * adelante entre dos fichas): una respuesta de la competición anterior no pinta
 * nada, no quita la espera de la nueva ni manda a la lista (CodeRabbit, FE #1106).
 */

const pendientes = { ficha: {}, lista: {} };
const pide = (tipo) => (id) =>
  new Promise((resolve, reject) => {
    pendientes[tipo][id] = { resolve, reject };
  });

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (id) => pide('ficha')(id) },
  listEnrollmentsUseCase: { execute: (id) => pide('lista')(id) },
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn() } }));
vi.mock('../utils/cierreDeEstaCarga', () => ({ seEstaCerrandoLaSesion: () => false }));

const { useFichaDeLaCompeticion } = await import('./useFichaDeLaCompeticion');
const customToast = (await import('../utils/toast')).default;

const navigate = vi.fn();
const monta = () =>
  renderHook(({ id }) => useFichaDeLaCompeticion({ id, userId: 'u-1', t: (k) => k, navigate }), {
    initialProps: { id: 'A' },
  });

const llega = async (tipo, id, valor) => {
  await act(async () => pendientes[tipo][id].resolve(valor));
};
const falla = async (tipo, id) => {
  await act(async () => pendientes[tipo][id].reject(new Error('caída')));
};

beforeEach(() => {
  pendientes.ficha = {};
  pendientes.lista = {};
  navigate.mockClear();
  customToast.error.mockClear();
});

describe('useFichaDeLaCompeticion: la carga de una ficha que ya no está en pantalla', () => {
  it('F1: la ficha y las inscripciones de la anterior llegan tarde y no pisan las de la nueva', async () => {
    const { result, rerender } = monta();
    rerender({ id: 'B' });
    await waitFor(() => expect(pendientes.ficha.B).toBeDefined());

    await llega('ficha', 'B', { id: 'B' });
    await llega('lista', 'B', ['inscrito de B']);
    await llega('ficha', 'A', { id: 'A' });
    await waitFor(() => expect(pendientes.lista.A).toBeUndefined());

    expect(result.current.competition).toEqual({ id: 'B' });
    expect(result.current.enrollments).toEqual(['inscrito de B']);
    expect(result.current.isLoadingCompetition).toBe(false);
  });

  it('F2: la anterior acaba mientras la nueva sigue cargando: ni se pinta ni quita la espera', async () => {
    const { result, rerender } = monta();
    rerender({ id: 'B' });
    await waitFor(() => expect(pendientes.ficha.B).toBeDefined());

    await llega('ficha', 'A', { id: 'A' });

    expect(result.current.competition).toBeNull();
    expect(result.current.isLoadingCompetition).toBe(true);

    await llega('ficha', 'B', { id: 'B' });
    await llega('lista', 'B', []);
    expect(result.current.competition).toEqual({ id: 'B' });
    expect(result.current.isLoadingCompetition).toBe(false);
  });

  it('F3: la lista de la anterior llega cuando ya se ve la nueva y no la pisa', async () => {
    const { result, rerender } = monta();
    await llega('ficha', 'A', { id: 'A' });
    rerender({ id: 'B' });
    await waitFor(() => expect(pendientes.ficha.B).toBeDefined());
    await llega('ficha', 'B', { id: 'B' });
    await llega('lista', 'B', ['inscrito de B']);

    await llega('lista', 'A', ['inscrito de A']);

    expect(result.current.enrollments).toEqual(['inscrito de B']);
    expect(result.current.inscripcionesSinCargar).toBe(false);
  });

  it('F4: si la anterior falla tarde, ni aviso de error ni salto a la lista', async () => {
    const { result, rerender } = monta();
    rerender({ id: 'B' });
    await waitFor(() => expect(pendientes.ficha.B).toBeDefined());
    await llega('ficha', 'B', { id: 'B' });
    await llega('lista', 'B', []);

    await falla('ficha', 'A');

    expect(customToast.error).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.competition).toEqual({ id: 'B' });
  });

  it('F5: la lista de la anterior falla tarde y no marca como sin cargar la de la nueva', async () => {
    const { result, rerender } = monta();
    await llega('ficha', 'A', { id: 'A' });
    rerender({ id: 'B' });
    await waitFor(() => expect(pendientes.ficha.B).toBeDefined());
    await llega('ficha', 'B', { id: 'B' });
    await llega('lista', 'B', ['inscrito de B']);

    await falla('lista', 'A');

    expect(result.current.enrollments).toEqual(['inscrito de B']);
    expect(result.current.inscripcionesSinCargar).toBe(false);
  });

  it.each([
    ['llega', ['inscrito de A'], false],
    ['falla', undefined, false],
  ])(
    'F7: la lista de la anterior %s ANTES que la de la nueva y tampoco la pisa',
    async (como, valor, sinCargar) => {
      const { result, rerender } = monta();
      await llega('ficha', 'A', { id: 'A' });
      rerender({ id: 'B' });
      await waitFor(() => expect(pendientes.ficha.B).toBeDefined());
      await llega('ficha', 'B', { id: 'B' });

      if (como === 'llega') await llega('lista', 'A', valor);
      else await falla('lista', 'A');

      expect(result.current.enrollments).toEqual([]);
      expect(result.current.inscripcionesSinCargar).toBe(sinCargar);

      await llega('lista', 'B', ['inscrito de B']);
      expect(result.current.enrollments).toEqual(['inscrito de B']);
    }
  );

  it('F6: sin cambiar de ficha, la carga normal pinta, lista y quita la espera (como siempre)', async () => {
    const { result } = monta();
    await llega('ficha', 'A', { id: 'A' });
    await llega('lista', 'A', ['inscrito de A']);

    expect(result.current.competition).toEqual({ id: 'A' });
    expect(result.current.enrollments).toEqual(['inscrito de A']);
    expect(result.current.isLoadingCompetition).toBe(false);
  });
});
