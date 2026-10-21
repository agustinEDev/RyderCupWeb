import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import es from '../../i18n/locales/es/common.json';
import en from '../../i18n/locales/en/common.json';

/**
 * N5 (FE #544): la página de acceso denegado pedía claves que no existían y
 * salía siempre en inglés, con los textos por defecto del código.
 */
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

describe('Unauthorized', () => {
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
