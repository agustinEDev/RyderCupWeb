import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El 429 se reconocía buscando «Rate limit» en el texto del error. Desde que
 * `apiRequest` lo traduce (4 oct 2026), ese texto ya no llega: se reconoce por
 * el `status`, y la pantalla sigue diciendo su aviso propio.
 */
const enviar = vi.fn();
const toastError = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: vi.fn() } }));
vi.mock('../composition', () => ({ requestPasswordResetUseCase: { execute: (...a) => enviar(...a) } }));
vi.mock('../components/ui/BrandMark', () => ({ default: () => null }));

const { default: ForgotPassword } = await import('./ForgotPassword');

const limite = () => Object.assign(new Error('t(common:demasiadasPeticiones)'), { status: 429 });

describe('ForgotPassword · demasiados intentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('F1: un 429 enseña el aviso propio de la pantalla', async () => {
    enviar.mockRejectedValue(limite());
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ana@club.es' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form'));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('forgotPassword.rateLimitError', expect.anything())
    );
  });

  it('F2: otro error enseña su texto', async () => {
    enviar.mockRejectedValue(Object.assign(new Error('Algo falló'), { status: 500 }));
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ana@club.es' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Algo falló', expect.anything()));
  });

  it('FE #826: el correo de «enviado» se parte en el móvil, como en el aviso del panel', async () => {
    enviar.mockResolvedValue({});
    const largo = 'un.correo.muy.largo.sin.espacios.para.partir@ejemplo-de-dominio.com';
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: largo } });
    fireEvent.submit(screen.getByRole('textbox').closest('form'));

    const correo = await screen.findByText(largo);
    expect(correo.className).toContain('wrap-anywhere');
  });
});
