import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', async () => {
  const React = await import('react');
  return {
    useTranslation: () => ({ t: (clave) => clave, ready: true, i18n: { language: 'es' } }),
    // Pinta el correo dentro de su componente, como el Trans de verdad
    Trans: ({ values, components }) =>
      React.cloneElement(components.correo, {}, values.email),
  };
});
vi.mock('../composition', () => ({ resendVerificationEmailUseCase: { execute: vi.fn() } }));

const { default: EmailVerificationBanner } = await import('./EmailVerificationBanner');

const CORREO = 'un.correo.muy.largo.sin.espacios.para.partir@ejemplo-de-dominio.com';

/**
 * FE #826: a 360 px la X se salía 11 px por la derecha. El correo no tiene
 * dónde partirse y la columna del texto (flex-1) no podía encoger: sin
 * `min-w-0` un hijo flex no baja de lo que mide su contenido. jsdom no mide,
 * así que se fijan las dos piezas que lo evitan; la medida real se hace a 360 px.
 */
describe('EmailVerificationBanner · no desborda en el móvil', () => {
  it('la columna del texto puede encoger por debajo de su contenido', () => {
    render(<EmailVerificationBanner userEmail={CORREO} />);

    expect(screen.getByText('emailVerification.title').parentElement.className).toContain('min-w-0');
  });

  it('el correo se parte donde haga falta', () => {
    render(<EmailVerificationBanner userEmail={CORREO} />);

    expect(screen.getByText(CORREO).className).toContain('[overflow-wrap:anywhere]');
  });
});
