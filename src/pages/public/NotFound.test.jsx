import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import es from '../../i18n/locales/es/common.json';
import en from '../../i18n/locales/en/common.json';

/**
 * La página de «esta dirección no existe» (FE #544).
 *
 *   caso | sesión (confirmada por el backend) | botones
 *   -----|------------------------------------|-----------------------------
 *   N1   | con sesión                         | «Ir al panel» → /dashboard
 *   N2   | sin sesión                         | «Ir al inicio» → /, «Entrar» → /login
 *   N2b  | todavía preguntando                | ninguno, y sin redirigir
 *   N3   | textos en es y en, con las mismas claves
 */
const sesion = vi.hoisted(() => ({ valor: { user: null, loading: false } }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion.valor }));

const busca = (bloque, clave) => clave.split('.').reduce((nodo, parte) => nodo?.[parte], bloque);

vi.mock('react-i18next', async () => {
  const textos = (await import('../../i18n/locales/es/common.json')).default;
  return {
    useTranslation: () => ({
      t: (clave, porDefecto) => busca(textos, clave) ?? (typeof porDefecto === 'string' ? porDefecto : clave),
      i18n: { language: 'es' },
    }),
  };
});

const { default: NotFound } = await import('./NotFound');

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/esto-no-existe']}>
      <NotFound />
    </MemoryRouter>
  );

describe('NotFound', () => {
  beforeEach(() => {
    sesion.valor = { user: null, loading: false };
  });

  it('N1: con sesión, un solo botón que lleva al panel', () => {
    sesion.valor = { user: { id: 'u-1' }, loading: false };
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Ir al inicio' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
  });

  it('N2: sin sesión, al inicio o a entrar', () => {
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Ir al panel' })).toBeNull();
  });

  it('N6: el fondo llena la pantalla (a 360 px la mitad de abajo salía blanca, pasada del 21 oct)', () => {
    abrir();

    const principal = screen.getByRole('main');
    expect(principal).toHaveClass('min-h-dvh', 'bg-gray-50');
    expect(principal).not.toHaveClass('min-h-[70vh]');
  });

  it('N2b: mientras se pregunta, el mensaje sin botones', () => {
    sesion.valor = { user: null, loading: true };
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeInTheDocument();
    expect(screen.getByText(es.notFound.message)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('N3: los textos existen en los dos idiomas', () => {
    const claves = ['title', 'message', 'goToDashboard', 'goHome', 'login'];
    for (const idioma of [es, en]) {
      for (const clave of claves) {
        expect(typeof idioma.notFound?.[clave]).toBe('string');
      }
    }
    expect(Object.keys(en.notFound).sort()).toEqual(Object.keys(es.notFound).sort());
    expect(en.notFound.title).not.toBe(es.notFound.title);
  });
});
