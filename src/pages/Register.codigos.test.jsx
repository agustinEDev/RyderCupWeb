import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * BE #519: el backend dice por qué rechaza la contraseña con un código, y la
 * pantalla lo enseña en el idioma de la app en vez del texto en español.
 */
const registrar = vi.fn();
const toastError = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'en' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({ useRedirectIfAuthenticated: () => false }));
vi.mock('../composition', () => ({
  registerUseCase: { execute: (...a) => registrar(...a) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: Register } = await import('./Register');

const enviar = async () => {
  const { container } = render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  const campo = (nombre) => container.querySelector(`[name="${nombre}"]`);
  fireEvent.change(campo('firstName'), { target: { name: 'firstName', value: 'Ana' } });
  fireEvent.change(campo('lastName'), { target: { name: 'lastName', value: 'Prueba' } });
  fireEvent.change(campo('email'), { target: { name: 'email', value: 'ana@example.com' } });
  fireEvent.change(campo('password'), { target: { name: 'password', value: 'Valida-Prueba123!' } });
  fireEvent.change(campo('confirmPassword'), { target: { name: 'confirmPassword', value: 'Valida-Prueba123!' } });
  fireEvent.submit(campo('password').closest('form'));
};

describe('Register · el rechazo del backend en su idioma', () => {
  beforeEach(() => vi.clearAllMocks());

  it('una contraseña común se dice con su clave, no con el texto en español', async () => {
    registrar.mockRejectedValue(
      Object.assign(new Error('Esta contraseña es demasiado común…'), {
        status: 400,
        errorCode: 'PASSWORD_TOO_COMMON',
      })
    );

    await enviar();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('validation.passwordCommon'));
  });

  it('otro error sigue enseñando su mensaje', async () => {
    registrar.mockRejectedValue(Object.assign(new Error('El email ya está registrado'), { status: 409 }));

    await enviar();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('El email ya está registrado'));
  });
});
