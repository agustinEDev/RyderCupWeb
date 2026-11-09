import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * E1 con el cierre DE VERDAD (revisión, 8 nov 2026): el otro test simula
 * `seEstaCerrandoLaSesion`; aquí la petición dispara el cierre por CSRF real antes de
 * rechazar, como hacen `api.js` y el interceptor, y la página no enseña el fallo.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ refetch: vi.fn() }) }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../composition', () => ({ confirmEmailChangeUseCase: { execute: vi.fn() } }));
vi.mock('../utils/stripSecretsFromAddressBar', () => ({
  stripSecretsFromAddressBar: vi.fn(),
  readStrippedSecret: () => null,
}));
vi.mock('../utils/sentryHelpers', () => ({ clearUserContext: vi.fn() }));
vi.mock('../utils/avisoDeCierreForzado', async (original) => ({
  ...(await original()),
  avisaDelCierreForzado: vi.fn(),
}));

const { confirmEmailChangeUseCase } = await import('../composition');
const { handleCsrfLogout } = await import('../infrastructure/http/csrfLogout');
const { olvidaElCierreDeEstaCarga } = await import('../utils/cierreDeEstaCarga');
const { default: ConfirmEmailChange } = await import('./ConfirmEmailChange');

describe('ConfirmEmailChange con el cierre por CSRF de verdad', () => {
  let idas;
  beforeEach(() => {
    olvidaElCierreDeEstaCarga();
    idas = [];
    vi.stubGlobal('location', {
      pathname: '/confirm-email-change',
      search: '',
      hash: '',
      origin: 'http://localhost:3000',
      set href(v) {
        idas.push(v);
      },
      get href() {
        return idas.at(-1) ?? '';
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    olvidaElCierreDeEstaCarga();
  });

  it('la petición cierra la sesión y rechaza: sigue «Confirmando…» y se va al login', async () => {
    confirmEmailChangeUseCase.execute.mockImplementation(async () => {
      handleCsrfLogout({ detail: 'CSRF token missing' });
      throw Object.assign(new Error('CSRF validation failed'), {
        errorCode: 'CSRF_VALIDATION_FAILED',
      });
    });

    render(
      <MemoryRouter initialEntries={['/confirm-email-change?token=tok-1']}>
        <Routes>
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
        </Routes>
      </MemoryRouter>
    );

    await vi.waitFor(() => expect(idas).toEqual(['/login']));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('confirmEmailChange.confirming')).toBeInTheDocument();
    expect(screen.queryByText('confirmEmailChange.failed')).toBeNull();
  });
});
