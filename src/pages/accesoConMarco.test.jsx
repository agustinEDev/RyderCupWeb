import { describe, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Cada pantalla de acceso, sobre el marco común (MarcoDeAcceso): su título del
 * héroe, sus ventajas, el logo del móvil y su «Volver al inicio».
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
    i18n: { language: 'es' },
    ready: true,
  }),
}));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({
  useRedirectIfAuthenticated: () => false,
}));
vi.mock('../components/auth/SignInForm', () => ({
  default: () => <form data-testid="formulario" />,
}));
vi.mock('../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('../composition', () => ({
  registerUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  requestPasswordResetUseCase: { execute: vi.fn().mockResolvedValue({}) },
  validateResetTokenUseCase: {
    execute: vi.fn().mockResolvedValue({ valid: true }),
  },
  resetPasswordUseCase: { execute: vi.fn() },
}));

const { default: Login } = await import('./Login');
const { default: Register } = await import('./Register');
const { default: ForgotPassword } = await import('./ForgotPassword');
const { default: ResetPassword } = await import('./ResetPassword');

const enRuta = (elemento) => render(<MemoryRouter>{elemento}</MemoryRouter>);

const heroe = (container) =>
  within(container.querySelector('.lg\\:w-1\\/2.overflow-hidden'));

// Título, ventajas (en orden) y el panel del color pedido
const compruebaElHeroe = (container, { titulo, ventajas, fondo }) => {
  const panel = heroe(container);
  expect(panel.getByRole('heading', { level: 2 }).textContent).toBe(titulo);
  const lista = container.querySelector('.space-y-4.mt-8');
  if (ventajas) {
    expect(
      [...lista.querySelectorAll('span')].map((s) => s.textContent),
    ).toEqual(ventajas);
  } else {
    expect(lista).toBeNull();
  }
  expect(
    container.querySelector('.lg\\:w-1\\/2.overflow-hidden').className,
  ).toContain(fondo);
};

const compruebaElLogoDelMovil = () => {
  const movil = screen
    .getAllByRole('link', { name: /RyderCupFriends/ })
    .find((a) => a.className.includes('lg:hidden'));
  expect(movil.getAttribute('href')).toBe('/');
};

const compruebaElVolver = (texto) => {
  const volver = screen.getByText(texto).closest('a');
  expect(volver.getAttribute('href')).toBe('/');
};

describe('pantallas de acceso con su marco', () => {
  it('P1: Login', () => {
    const { container } = enRuta(<Login />);
    compruebaElHeroe(container, {
      titulo: 'login.welcomeBack',
      ventajas: [
        'login.features.tournaments',
        'login.features.statistics',
        'login.features.liveScoring',
        'login.features.friends',
      ],
      fondo: 'bg-primary',
    });
    compruebaElLogoDelMovil();
    compruebaElVolver('login.backToHome');
    expect(screen.getByTestId('formulario')).toBeTruthy();
  });

  it('P2: Registro, en acento y con sus tres cifras', () => {
    const { container } = enRuta(<Register />);
    compruebaElHeroe(container, {
      titulo: 'register.heroTitle',
      ventajas: [
        'register.benefits.quickSetup',
        'register.benefits.fairHandicap',
        'register.benefits.mobileFriendly',
        'register.benefits.friendships',
      ],
      fondo: 'bg-accent',
    });
    expect(heroe(container).getByText('register.stats.free')).toBeTruthy();
    expect(heroe(container).getByText('register.stats.handicap')).toBeTruthy();
    expect(heroe(container).getByText('register.stats.noAds')).toBeTruthy();
    compruebaElLogoDelMovil();
    compruebaElVolver('register.backToHome');
  });

  it('P3: ¿Olvidaste la contraseña?, el formulario', () => {
    const { container } = enRuta(<ForgotPassword />);
    compruebaElHeroe(container, {
      titulo: 'forgotPassword.heroTitle',
      ventajas: [
        'forgotPassword.features.secure',
        'forgotPassword.features.expires',
        'forgotPassword.features.checkSpam',
      ],
      fondo: 'bg-primary',
    });
    compruebaElLogoDelMovil();
    compruebaElVolver('forgotPassword.backToHome');
  });

  it('P4: ¿Olvidaste la contraseña?, ya enviado: sin ventajas y con «reenviar» en vez de «Volver»', async () => {
    const { container } = enRuta(<ForgotPassword />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'ana@club.es' },
    });
    fireEvent.submit(screen.getByRole('textbox').closest('form'));
    await waitFor(() =>
      expect(screen.getByText('forgotPassword.emailSentTitle')).toBeTruthy(),
    );
    compruebaElHeroe(container, {
      titulo: 'forgotPassword.checkEmailTitle',
      fondo: 'bg-primary',
    });
    compruebaElLogoDelMovil();
    expect(screen.queryByText('forgotPassword.backToHome')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'forgotPassword.didntReceive' }),
    ).toBeTruthy();
  });

  it('P5: Restablecer la contraseña', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/reset-password/${'c'.repeat(48)}`]}>
        <Routes>
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('resetPassword.title');
    compruebaElHeroe(container, {
      titulo: 'resetPassword.heroTitle',
      ventajas: [
        'resetPassword.securityTips.tip1',
        'resetPassword.securityTips.tip2',
        'resetPassword.securityTips.tip3',
        'resetPassword.securityTips.tip4',
      ],
      fondo: 'bg-primary',
    });
    compruebaElLogoDelMovil();
    compruebaElVolver('resetPassword.backToHome');
  });
});
