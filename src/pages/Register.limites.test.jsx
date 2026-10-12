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
 * FE #827: un `maxLength` en un campo de contraseña corta EN SILENCIO lo que se
 * pega (y cuenta unidades UTF-16, no caracteres): con 128 se perdían emojis de
 * una contraseña válida, y con cualquier otro número se acaba guardando una que
 * el usuario no eligió. Sin límite en el campo, el único lo dice la validación,
 * como en el login y el reset.
 */
describe('Register · el campo no corta una contraseña válida', () => {
  it.each(['password', 'confirmPassword'])('%s no corta lo que se pega', (nombre) => {
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(container.querySelector(`[name="${nombre}"]`).hasAttribute('maxlength')).toBe(false);
  });
});
