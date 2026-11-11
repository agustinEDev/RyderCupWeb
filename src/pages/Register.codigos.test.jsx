import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * BE #519: el backend dice por qué rechaza la contraseña con un código, y la
 * pantalla lo enseña en el idioma de la app en vez del texto en español.
 */
const registrar = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'en' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: (...a) => toastSuccess(...a), info: vi.fn() } }));
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
  // Sin aceptar los Términos no se envía (Register.legal.test.jsx)
  fireEvent.click(campo('acceptTerms'));
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
    registrar.mockRejectedValue(Object.assign(new Error('Error interno'), { status: 500 }));

    await enviar();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Error interno'));
  });
});

describe('Register · sin aviso de correo con cuenta (fase 3, BE #787)', () => {
  beforeEach(() => vi.clearAllMocks());

  // El backend responde 201 siempre (desaparece el 409): decir aquí que el correo ya
  // tiene cuenta enumeraba usuarios. Todos acaban igual: el toast y a /login
  it('registrarse acaba con el toast de éxito y sin ningún aviso junto al correo', async () => {
    registrar.mockResolvedValue({ id: 'u1' });

    await enviar();

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('register.success'));
    expect(screen.queryByText(/register.emailHasAccount/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'register.emailHasAccountLink' })).not.toBeInTheDocument();
  });

  it('un 409 (de un backend anterior) ya no pinta el aviso ámbar: es un error más', async () => {
    registrar.mockRejectedValue(Object.assign(new Error('User already exists'), { status: 409 }));

    await enviar();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('User already exists'));
    expect(screen.queryByText(/register.emailHasAccount/)).not.toBeInTheDocument();
  });
});
