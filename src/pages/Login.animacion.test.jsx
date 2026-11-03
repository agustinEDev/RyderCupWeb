import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El primer «Iniciar Sesión» a veces se perdía (QA, FE #865-12): la caja del
 * formulario entraba desplazándose y creciendo, y un clic en ese medio segundo
 * podía soltarse fuera del botón, que se había movido. Luego solo aparecía, y
 * desde el 3 nov 2026 sale ya pintada: ninguna pantalla entra desde invisible
 * (`sinFundidoAlEntrar.test.js`). El aviso verde de arriba, tampoco.
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


describe('Login · la caja del formulario sale ya pintada', () => {
  it('A1: sin desplazarse, ni crecer, ni fundido', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByTestId('formulario').closest('[data-initial]')).toBeNull();
  });

  it('A2: el aviso verde con el que se llega, tampoco (revisor, 3 nov 2026)', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { message: 'cuenta creada' } }]}>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('cuenta creada').closest('[data-initial]')).toBeNull();
  });
});
