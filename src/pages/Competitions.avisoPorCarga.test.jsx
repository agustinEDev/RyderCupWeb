import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/**
 * Torneos: el aviso de una carga fallida sale una vez por carga (T2).
 *
 *   #      caso                                         | qué pasa
 *   -------|----------------------------------------------|---------------------------
 *   T2-19  carga fallida y luego cambia el idioma        | no sale un segundo aviso
 */
const mockList = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => mockList(...a) },
}));
const sesion = vi.hoisted(() => ({
  user: { id: 'u-1' },
  instantanea: { user: { id: 'u-1' }, loading: false },
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion.instantanea }));
vi.mock('../services/sesionCompartida', () => ({
  consultaLaSesion: () => Promise.resolve(sesion.user),
  loQueHaySobreLaSesion: () => ({ user: sesion.user }),
}));
vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u-1' }, clearAuth: vi.fn() }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
// El idioma como una pieza que avisa al cambiar: cambiarlo vuelve a pintar
// con una `t` nueva, como react-i18next
const idioma = vi.hoisted(() => ({
  prefijo: '',
  oyentes: new Set(),
  t: (k) => k,
}));
const cambiaElIdioma = (prefijo) => {
  idioma.prefijo = prefijo;
  idioma.t = (k) => `${prefijo}${k}`;
  idioma.oyentes.forEach((o) => o());
};
vi.mock('react-i18next', async () => {
  const { useSyncExternalStore } = await import('react');
  const suscribe = (o) => {
    idioma.oyentes.add(o);
    return () => idioma.oyentes.delete(o);
  };
  return {
    useTranslation: () => {
      const t = useSyncExternalStore(suscribe, () => idioma.t);
      return { t, i18n: { language: idioma.prefijo || 'es' } };
    },
  };
});
const toasts = vi.hoisted(() => []);
vi.mock('../utils/toast', () => ({
  default: { error: (m) => toasts.push(m), success: vi.fn() },
}));

const Competitions = (await import('./Competitions')).default;
const { loader, shouldRevalidate } = await import('./Competitions.datos');
const { olvidaTodo } = await import('../services/loUltimoConocido');
const { marcaElArranque, olvidaLoQueEstaEnCamino } =
  await import('../services/cargaDeLaPantalla');

const delServidor = (status) => Object.assign(new Error('caído'), { status });

const pinta = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/competitions',
        loader,
        shouldRevalidate,
        element: <Competitions />,
      },
    ],
    {
      initialEntries: ['/competitions'],
    },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe('Torneos: un aviso por carga fallida (T2)', () => {
  beforeEach(() => {
    toasts.length = 0;
    mockList.mockReset();
    olvidaTodo();
    marcaElArranque(true);
    olvidaLoQueEstaEnCamino();
    cambiaElIdioma('');
  });

  it('T2-19: tras una carga fallida, cambiar de idioma no repite el aviso', async () => {
    mockList.mockRejectedValue(delServidor(500));
    pinta();
    await screen.findByTestId('competiciones-sin-cargar');
    await waitFor(() =>
      expect(toasts).toEqual(['detail.failedToLoadCompetitions']),
    );

    act(() => cambiaElIdioma('en:'));
    await act(async () => {});
    await act(async () => {});

    // Se pintó en el idioma nuevo, y aun así ningún aviso más
    expect(screen.getAllByText(/^en:/).length).toBeGreaterThan(0);
    expect(toasts).toEqual(['detail.failedToLoadCompetitions']);
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});
