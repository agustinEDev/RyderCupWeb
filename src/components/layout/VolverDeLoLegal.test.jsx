import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import es from '../../i18n/locales/es/legal.json';
import en from '../../i18n/locales/en/legal.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

vi.mock('../../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: vi.fn(),
  // Si alguien la usara, en una página pública con un `user` rancio acabaría en
  // «tu sesión expiró»: que conste que no se toca
  fetchWithTokenRefresh: vi.fn(),
}));

vi.mock('../../services/sesionCompartida', () => ({
  anotaLaSesion: vi.fn(),
}));

const { refreshAccessToken, fetchWithTokenRefresh } = await import('../../utils/tokenRefreshInterceptor');
const { anotaLaSesion } = await import('../../services/sesionCompartida');
const { default: VolverDeLoLegal } = await import('./VolverDeLoLegal');
const { TOPE_DE_LA_COMPROBACION_MS } = await import('../../services/sesionEnPaginaPublica');

/**
 * Salir de los documentos legales sin pasar por la portada (20 oct 2026).
 *
 * - L1: «Volver» arriba del contenido.
 * - L2: con página anterior dentro de la aplicación, a ella.
 * - L3: sin ella, al panel con sesión confirmada por el backend y a la portada
 *   sin sesión, sin poder echar a un visitante al «tu sesión expiró».
 */

const USUARIO = { id: 'u1', email: 'a@b.es', first_name: 'Ana' };

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

let almacen;
const fetchFalso = vi.fn();

const conUsuarioGuardado = () => {
  almacen.user = JSON.stringify(USUARIO);
};

const abrir = (entradas = ['/terms'], indice = entradas.length - 1) =>
  render(
    <MemoryRouter initialEntries={entradas} initialIndex={indice}>
      <Routes>
        <Route path="/" element={<p>portada</p>} />
        <Route path="/dashboard" element={<p>panel</p>} />
        <Route path="/profile" element={<p>perfil</p>} />
        <Route path="/terms" element={<VolverDeLoLegal />} />
      </Routes>
    </MemoryRouter>
  );

const pulsar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'volver' }));
  });
};

beforeEach(() => {
  almacen = {};
  vi.stubGlobal('localStorage', {
    getItem: (clave) => almacen[clave] ?? null,
    setItem: (clave, valor) => {
      almacen[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete almacen[clave];
    },
  });
  vi.stubGlobal('fetch', fetchFalso);
  fetchFalso.mockReset();
  refreshAccessToken.mockReset();
  anotaLaSesion.mockReset();
  fetchWithTokenRefresh.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('L1 · el botón', () => {
  it('L1a: pinta «Volver»', () => {
    abrir();

    expect(screen.getByRole('button', { name: 'volver' })).toBeInTheDocument();
  });

  it('L1b: el texto existe en los dos idiomas', () => {
    expect(es.volver).toBe('Volver');
    expect(en.volver).toBe('Back');
  });

  it('L1c: montar la página no pregunta nada a la red', () => {
    conUsuarioGuardado();
    abrir();

    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('L2 · con página anterior dentro de la aplicación', () => {
  it('L2a: vuelve justo a ella, sin preguntar por la sesión', async () => {
    conUsuarioGuardado();
    abrir(['/profile', '/terms']);

    await pulsar();

    expect(screen.getByText('perfil')).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('L3 · sin página anterior (enlace directo o pestaña nueva)', () => {
  it('L3a: sin usuario guardado va a la portada sin tocar la red', async () => {
    abrir();

    await pulsar();

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('L3b: con la sesión confirmada por el backend va al panel y la siembra', async () => {
    conUsuarioGuardado();
    fetchFalso.mockResolvedValueOnce(respuesta(200, USUARIO));
    abrir();

    await pulsar();

    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/current-user$/);
    expect(fetchFalso.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
    expect(anotaLaSesion).toHaveBeenCalledWith(USUARIO);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('L3c: con el access caducado y el refresh vivo refresca y va al panel', async () => {
    conUsuarioGuardado();
    fetchFalso.mockResolvedValueOnce(respuesta(401)).mockResolvedValueOnce(respuesta(200, USUARIO));
    refreshAccessToken.mockResolvedValueOnce({});
    abrir();

    await pulsar();

    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it('L3d: con la sesión muerta (el refresco rechazado) va a la portada sin el interceptor', async () => {
    conUsuarioGuardado();
    fetchFalso.mockResolvedValueOnce(respuesta(401));
    refreshAccessToken.mockRejectedValueOnce(Object.assign(new Error('caducada'), { response: { status: 401 } }));
    abrir();

    await pulsar();

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(anotaLaSesion).not.toHaveBeenCalled();
    expect(fetchWithTokenRefresh).not.toHaveBeenCalled();
  });

  it('L3e: si tras refrescar sigue el 401, a la portada', async () => {
    conUsuarioGuardado();
    fetchFalso.mockResolvedValue(respuesta(401));
    refreshAccessToken.mockResolvedValueOnce({});
    abrir();

    await pulsar();

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(anotaLaSesion).not.toHaveBeenCalled();
  });

  it('L3f: sin red no se sabe, y en la duda a la portada', async () => {
    conUsuarioGuardado();
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    abrir();

    await pulsar();

    expect(screen.getByText('portada')).toBeInTheDocument();
  });

  it('L3g: con un error del servidor, a la portada', async () => {
    conUsuarioGuardado();
    fetchFalso.mockResolvedValueOnce(respuesta(500));
    abrir();

    await pulsar();

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(anotaLaSesion).not.toHaveBeenCalled();
  });

  it('L3h: si el backend no contesta, al vencer el plazo a la portada', async () => {
    vi.useFakeTimers();
    conUsuarioGuardado();
    fetchFalso.mockReturnValueOnce(new Promise(() => {}));
    abrir();

    await pulsar();
    expect(screen.queryByText('portada')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOPE_DE_LA_COMPROBACION_MS);
    });

    expect(screen.getByText('portada')).toBeInTheDocument();
  });

  it('L3i: una respuesta que llega tras el plazo no siembra nada', async () => {
    vi.useFakeTimers();
    conUsuarioGuardado();
    let contesta;
    fetchFalso.mockReturnValueOnce(new Promise((r) => { contesta = r; }));
    abrir();

    await pulsar();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOPE_DE_LA_COMPROBACION_MS);
    });
    await act(async () => {
      contesta(respuesta(200, USUARIO));
    });

    expect(screen.getByText('portada')).toBeInTheDocument();
    expect(anotaLaSesion).not.toHaveBeenCalled();
  });

  it('L3j: mientras pregunta, el botón se desactiva y un segundo toque no repite', async () => {
    conUsuarioGuardado();
    fetchFalso.mockReturnValueOnce(new Promise(() => {}));
    abrir();

    await pulsar();
    const boton = screen.getByRole('button', { name: 'volver' });
    expect(boton).toBeDisabled();
    await act(async () => {
      fireEvent.click(boton);
    });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
