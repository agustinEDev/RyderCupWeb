import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({ useRedirectIfAuthenticated: () => false }));
vi.mock('../composition', () => ({
  registerUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: Register } = await import('./Register');

/**
 * FE #827: `maxLength` del HTML cuenta unidades UTF-16 y la política cuenta
 * caracteres. Con 128 el navegador cortaba sin avisar una contraseña válida con
 * emojis; 256 es lo más que ocupan 128 caracteres, y el límite lo dice la validación.
 */
describe('Register · el campo no corta una contraseña válida', () => {
  it.each(['password', 'confirmPassword'])('%s admite 128 caracteres de dos unidades', (nombre) => {
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(Number(container.querySelector(`[name="${nombre}"]`).getAttribute('maxlength'))).toBe(256);
  });
});
