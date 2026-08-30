/**
 * LA TABLA — la lista de competiciones cuando no se puede preguntar (FE, hotfix
 * v2.24.1).
 *
 *   caso                          | qué se ve
 *   ------------------------------|---------------------------------------
 *   sin red                        | que no hay conexión; NO «no tienes ninguna»
 *   sin red                        | tampoco el botón de crear la primera
 *   error del servidor             | el aviso de siempre, y la lista vacía
 *
 * Vacío porque no se ha podido preguntar no es vacío: decir «Mostrando 0 de 0»
 * y ofrecer «Crear Tu Primera Competición» es afirmar algo que nadie ha
 * comprobado, y quien tenga las suyas las ve desaparecer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockList = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => mockList(...a) },
}));

// El MISMO objeto en cada render: uno nuevo recrea `loadCompetitions` y el
// efecto vuelve a cargar sin parar. En la aplicación la identidad es estable
const sesion = { user: { id: 'u-1' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u-1' }, clearAuth: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

const errores = [];
vi.mock('../utils/toast', () => ({
  default: { error: (m) => errores.push(m), success: vi.fn() },
}));

const Competitions = (await import('./Competitions')).default;

const pinta = () => render(<MemoryRouter><Competitions /></MemoryRouter>);

describe('Mis Competiciones sin cobertura', () => {
  beforeEach(() => {
    errores.length = 0;
    mockList.mockReset();
    sesion.user = { id: 'u-1' };
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  });

  it('sin red no dice que no tengas ninguna', async () => {
    mockList.mockRejectedValue(new TypeError('Failed to fetch'));

    pinta();

    await waitFor(() => expect(screen.getByTestId('competiciones-sin-cobertura')).toBeInTheDocument());
    expect(screen.queryByText('myCompetitions.createYourFirstCompetition')).not.toBeInTheDocument();
  });

  it('y el aviso no enseña el mensaje técnico del error', async () => {
    // Sin cobertura ahí venía el aviso crudo del service worker, con la URL de
    // la API dentro, en inglés
    mockList.mockRejectedValue(new TypeError('FetchEvent.respondWith received an error'));

    pinta();

    await waitFor(() => expect(errores).toHaveLength(1));
    expect(errores[0]).toBe('sinConexion.mensaje');
  });

  it('y a quien TIENE competiciones no se las quita de la pantalla', async () => {
    // Lo que de verdad importa: vaciar la lista al perder la red hace
    // desaparecer lo que el jugador ya estaba viendo, y encima le ofrece crear
    // «su primera». Con la lista ya vacía este defecto no se nota, por eso hay
    // que probarlo con datos delante
    mockList.mockResolvedValueOnce([
      { id: 'c-1', name: 'Torneo del Club', status: 'IN_PROGRESS', creatorId: 'u-1', participants: [] },
    ]);

    const { rerender } = pinta();
    await waitFor(() => expect(screen.getByText('Torneo del Club')).toBeInTheDocument());

    // Y ahora se cae la red. Se cambia la identidad del usuario para que la
    // pantalla vuelva a cargar, que es lo único que dispara una recarga aquí
    mockList.mockRejectedValue(new TypeError('Failed to fetch'));
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    sesion.user = { id: 'u-1' };
    rerender(<MemoryRouter><Competitions /></MemoryRouter>);

    await waitFor(() => expect(errores.length).toBeGreaterThan(0));
    // Que React acabe de aplicar lo del `catch` antes de mirar: si no, se
    // comprueba la pantalla de antes y el test pasa aunque la lista se vacíe
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Torneo del Club')).toBeInTheDocument();
  });

  it('al volver la señal deja de decir que no hay conexión', async () => {
    // Si no, la pantalla seguía diciendo «sin conexión» con el aviso de arriba
    // ya desaparecido, contradiciéndose, y no volvía a ofrecer crear la primera
    mockList.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { rerender } = pinta();
    await waitFor(() => expect(screen.getByTestId('competiciones-sin-cobertura')).toBeInTheDocument());

    mockList.mockResolvedValue([]);
    sesion.user = { id: 'u-1' };
    rerender(<MemoryRouter><Competitions /></MemoryRouter>);

    // Se espera al estado vacío DE VERDAD, no a que el panel desaparezca: eso
    // último también se cumple mientras la pantalla está cargando
    await waitFor(() =>
      expect(screen.getByText('myCompetitions.createYourFirstCompetition')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });

  it('un filtro que no encuentra nada no se confunde con falta de red', async () => {
    // Sin cobertura la lista se conserva, así que filtrar hasta dejarla en cero
    // no es «no se ha podido consultar»: se consultó, y no había coincidencias
    mockList.mockResolvedValueOnce([
      { id: 'c-1', name: 'Torneo del Club', status: 'IN_PROGRESS', creatorId: 'u-1', participants: [] },
    ]);

    const { rerender } = pinta();
    await waitFor(() => expect(screen.getByText('Torneo del Club')).toBeInTheDocument());

    mockList.mockRejectedValue(new TypeError('Failed to fetch'));
    sesion.user = { id: 'u-1' };
    rerender(<MemoryRouter><Competitions /></MemoryRouter>);
    await waitFor(() => expect(errores.length).toBeGreaterThan(0));

    // Y ahora se filtra hasta no dejar ninguna a la vista
    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), {
      target: { value: 'no existe nada con este nombre' },
    });

    await waitFor(() =>
      expect(screen.getByText('myCompetitions.noCompetitionsFound')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });

  it('un error del servidor sí deja la lista vacía, y avisa como siempre', async () => {
    mockList.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));

    pinta();

    await waitFor(() => expect(errores).toHaveLength(1));
    expect(errores[0]).toBe('detail.failedToLoadCompetitions');
    expect(screen.queryByTestId('competiciones-sin-cobertura')).not.toBeInTheDocument();
  });
});
