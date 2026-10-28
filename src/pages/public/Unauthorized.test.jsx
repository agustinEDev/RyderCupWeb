import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import es from '../../i18n/locales/es/common.json';
import en from '../../i18n/locales/en/common.json';

/**
 * N5 (FE #544): la página de acceso denegado pedía claves que no existían y
 * salía siempre en inglés, con los textos por defecto del código.
 */
const sesion = vi.hoisted(() => ({ valor: { user: null, loading: false } }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion.valor }));

const busca = (bloque, clave) => clave.split('.').reduce((nodo, parte) => nodo?.[parte], bloque);

vi.mock('react-i18next', async () => {
  const textos = (await import('../../i18n/locales/es/common.json')).default;
  return {
    useTranslation: () => ({
      // Como i18next: sin la clave, el texto por defecto que lleve la llamada
      t: (clave, porDefecto) => busca(textos, clave) ?? (typeof porDefecto === 'string' ? porDefecto : clave),
      i18n: { language: 'es' },
    }),
  };
});

const { default: Unauthorized } = await import('./Unauthorized');

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/unauthorized']}>
      <Unauthorized />
    </MemoryRouter>
  ).container.firstElementChild;

describe('Unauthorized', () => {
  beforeEach(() => {
    sesion.valor = { user: null, loading: false };
  });

  // QA del 21 oct 2026 (U1): con sesión, en el móvil, 100vh más el hueco de la
  // barra inferior daban 64 px de desplazamiento sobrante. El hueco lo publica
  // App en `--alto-barra-inferior` solo cuando pinta la barra; la página no
  // lee la sesión (antes ignoraba `loading` y no sabía de los Términos)
  // Y el aviso de instalar, que también flota abajo (revisor de las sobras del QA)
  const ALTO = ['min-h-[calc(100dvh-var(--alto-barra-inferior,0px)-var(--alto-aviso-instalar,0px))]', 'md:min-h-[calc(100dvh-var(--alto-aviso-instalar,0px))]'];

  it('U1: sin sesión, la pantalla menos el hueco que diga App', () => {
    const pagina = abrir();

    expect(pagina).toHaveClass(...ALTO);
    expect(pagina).not.toHaveClass('min-h-dvh');
    expect(pagina.style.minHeight).toBe('');
  });

  it('U1b: con sesión, el mismo alto: no lo decide el usuario sino la barra que pinta App', () => {
    sesion.valor = { user: { id: 'u-1' }, loading: false };
    const pagina = abrir();

    expect(pagina).toHaveClass(...ALTO);
    expect(pagina).not.toHaveClass('min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))]', 'min-h-dvh');
    expect(pagina.style.minHeight).toBe('');
  });

  it('U1c: el resto del aspecto sigue igual (centrado, gris de fondo)', () => {
    const pagina = abrir();

    expect(pagina.style.display).toBe('flex');
    expect(pagina.style.justifyContent).toBe('center');
    expect(pagina.style.backgroundColor).toBe('rgb(249, 250, 251)');
  });

  it('N5: se pinta en español', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/unauthorized', state: { from: { pathname: '/admin' } } }]}>
        <Unauthorized />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: es.unauthorized.title })).toBeInTheDocument();
    expect(screen.getByText(es.unauthorized.message)).toBeInTheDocument();
    expect(screen.getByText(`${es.unauthorized.attempted}: /admin`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: es.unauthorized.goToDashboard })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: es.unauthorized.goBack })).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).toBeNull();
  });

  it('N5: las cinco claves en los dos idiomas', () => {
    for (const idioma of [es, en]) {
      for (const clave of ['title', 'message', 'attempted', 'goToDashboard', 'goBack']) {
        expect(typeof idioma.unauthorized?.[clave]).toBe('string');
      }
    }
    expect(es.unauthorized.title).not.toBe(en.unauthorized.title);
  });
});
