import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Por donde arranca la aplicacion instalada (FE #465). Lo que se prueba es lo
 * unico que decide: a donde manda a cada uno.
 *
 * Existe para que `/` deje de hacer dos papeles. Antes habia que adivinar, por
 * el tipo de navegacion, si una visita a la portada era un arranque, y eso fallo
 * dos veces: al entrar por un enlace compartido y luego pulsar el logo, y al
 * volver atras desde el panel.
 */
const estado = { instalada: true, comprobando: false };

vi.mock('../hooks/useStandalone', () => ({
  useStandalone: () => estado.instalada,
}));

vi.mock('../hooks/useRedirectIfAuthenticated', () => ({
  useRedirectIfAuthenticated: () => estado.comprobando,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

vi.mock('../components/auth/SignInForm', () => ({
  default: () => <div data-testid="formulario-de-acceso" />,
}));

const AppStart = (await import('./AppStart')).default;

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<AppStart />} />
        <Route path="/" element={<div>PORTADA</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('AppStart', () => {
  beforeEach(() => {
    estado.instalada = true;
    estado.comprobando = false;
  });

  it('instalada y sin sesion, enseña el acceso', () => {
    pintar();
    expect(screen.getByTestId('formulario-de-acceso')).toBeInTheDocument();
    expect(screen.queryByText('PORTADA')).not.toBeInTheDocument();
  });

  it('en el navegador manda a la portada', () => {
    // La ruta puede alcanzarse por un enlace copiado o tras desinstalar: en el
    // navegador la puerta es la portada
    estado.instalada = false;
    pintar();
    expect(screen.getByText('PORTADA')).toBeInTheDocument();
  });

  it('mientras resuelve la sesion no enseña el formulario', () => {
    // Apareceria entero para desaparecer un segundo despues
    estado.comprobando = true;
    pintar();
    expect(screen.queryByTestId('formulario-de-acceso')).not.toBeInTheDocument();
  });

  it('deja una salida hacia la portada', () => {
    pintar();
    const salida = screen.getByText('appStart.whatIsThis');
    expect(salida.closest('a')).toHaveAttribute('href', '/');
  });
});
