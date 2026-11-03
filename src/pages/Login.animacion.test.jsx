import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El primer «Iniciar Sesión» a veces se perdía (QA, FE #865-12): la caja del
 * formulario entraba desplazándose y creciendo, y un clic en ese medio segundo
 * podía soltarse fuera del botón, que se había movido. Ahora solo aparece.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({ useRedirectIfAuthenticated: () => false }));
vi.mock('../components/auth/SignInForm', () => ({ default: () => <form data-testid="formulario" /> }));
// Lo que importa es con qué entra cada caja: se deja a la vista
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, initial, animate, transition, ...resto }) => {
          void animate;
          void transition;
          return (
            <div data-initial={JSON.stringify(initial ?? null)} {...resto}>
              {children}
            </div>
          );
        },
    }
  ),
}));

const Login = (await import('./Login')).default;

const conQueEntra = (el) => JSON.parse(el.closest('[data-initial]').getAttribute('data-initial'));

describe('Login · la caja del formulario solo aparece', () => {
  it('A1: sin desplazarse ni crecer', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(conQueEntra(screen.getByTestId('formulario'))).toEqual({ opacity: 0 });
  });

  it('A2: el aviso de arriba tampoco', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { message: 'cuenta creada' } }]}>
        <Login />
      </MemoryRouter>
    );

    expect(conQueEntra(screen.getByText('cuenta creada'))).toEqual({ opacity: 0 });
  });
});
