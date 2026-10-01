import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  stripSecretsFromAddressBar,
  readStrippedSecret,
  whenAddressBarIsClean,
} from './stripSecretsFromAddressBar';

/**
 * El secreto se quita de la barra de direcciones en cuanto la página lo lee.
 * Replay graba el `href` de la página al empezar sin pasar por ningún gancho
 * (solo filtra sus eventos «custom»), y la barra acaba también en el Referer y
 * en el historial del navegador (revisión del 30 sep 2026).
 *
 *   #   barra                                              | queda
 *   ----|--------------------------------------------------|-------------------------------
 *   A1  /reset-password/<token>?lang=es#x                 | /reset-password?lang=es#x
 *   A2  /verify-email?token=<t>&lang=es                   | /verify-email?lang=es
 *   A3  /auth/google/callback?code=<c>&state=<s>&error=e  | /auth/google/callback?error=e
 *   A4  una barra sin secretos                            | ni se toca
 *   A5  el estado del historial (el del router)           | se conserva
 *   A6  el token quitado                                  | queda en el estado del historial
 *   A7  al recargar sin token en la barra                 | se recupera del estado
 *   A8  el code/state de Google                           | no se guardan: son de un solo uso
 *   W1  Replay con la barra limpia                        | se carga ya
 *   W2  Replay con un secreto en la barra                 | espera a que la página lo quite
 *   W3  lat/lon en la barra                               | no son secretos de la barra: no espera
 *   N1  una query que el navegador reescribiría (%20, ?flag) | no es un secreto: ni se toca ni espera
 *   N2  un secreto junto a esa query                      | se quita solo el secreto
 *   (CodeRabbit, #772: comparar la URL reconstruida daba secretos donde no los había)
 */
const ir = (url, estado = null) => window.history.replaceState(estado, '', url);
const barra = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

describe('stripSecretsFromAddressBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    ir('/');
  });

  it('A1: quita el token de la ruta y deja lo demás', () => {
    ir('/reset-password/abc123?lang=es#x');
    stripSecretsFromAddressBar();
    expect(barra()).toBe('/reset-password?lang=es#x');
  });

  it('A2: quita el token de la query', () => {
    ir('/verify-email?token=abc123&lang=es');
    stripSecretsFromAddressBar();
    expect(barra()).toBe('/verify-email?lang=es');
  });

  it('A3: quita el code y el state de Google, y deja el error', () => {
    ir('/auth/google/callback?code=abc&state=def&error=access_denied');
    stripSecretsFromAddressBar();
    expect(barra()).toBe('/auth/google/callback?error=access_denied');
  });

  it('A4: una barra sin secretos ni se toca', () => {
    ir('/dashboard?tab=1');
    const espia = vi.spyOn(window.history, 'replaceState');
    stripSecretsFromAddressBar();
    expect(espia).not.toHaveBeenCalled();
  });

  it('A5: conserva el estado del historial, que es del router', () => {
    ir('/verify-email?token=abc', { idx: 3, key: 'k' });
    stripSecretsFromAddressBar();
    expect(window.history.state).toMatchObject({ idx: 3, key: 'k' });
  });

  it('A6: guarda el token quitado en el estado del historial', () => {
    ir('/reset-password/abc123');
    stripSecretsFromAddressBar();
    expect(readStrippedSecret('token')).toBe('abc123');
    ir('/verify-email?token=def456');
    stripSecretsFromAddressBar();
    expect(readStrippedSecret('token')).toBe('def456');
  });

  it('A7: sin token en la barra ni en el estado, no hay nada que recuperar', () => {
    ir('/reset-password');
    expect(readStrippedSecret('token')).toBeNull();
  });

  it('A8: no guarda el code ni el state de Google', () => {
    ir('/auth/google/callback?code=abc&state=def');
    stripSecretsFromAddressBar();
    expect(readStrippedSecret('code')).toBeNull();
    expect(readStrippedSecret('state')).toBeNull();
  });

  it('W1: con la barra limpia, Replay se carga ya', () => {
    ir('/dashboard');
    const cargar = vi.fn();
    whenAddressBarIsClean(cargar);
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('W2: con un secreto en la barra, espera a que la página lo quite', () => {
    vi.useFakeTimers();
    try {
      ir('/reset-password/abc123');
      const cargar = vi.fn();
      whenAddressBarIsClean(cargar);
      vi.advanceTimersByTime(5000);
      expect(cargar).not.toHaveBeenCalled();

      stripSecretsFromAddressBar();
      vi.advanceTimersByTime(1000);
      expect(cargar).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5000);
      expect(cargar).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('N1: una query sin secretos que se escribe de otra forma no es un secreto', () => {
    ir('/buscar?q=a%20b&flag&x=1&');
    const espia = vi.spyOn(window.history, 'replaceState');
    const cargar = vi.fn();
    whenAddressBarIsClean(cargar);
    stripSecretsFromAddressBar();
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(espia).not.toHaveBeenCalled();
    expect(barra()).toBe('/buscar?q=a%20b&flag&x=1&');
  });

  it('N2: con un secreto, se quita el secreto y queda lo demás', () => {
    ir('/verify-email?q=a%20b&token=abc123&lang=es');
    stripSecretsFromAddressBar();
    expect(barra()).not.toContain('abc123');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('a b');
    expect(new URLSearchParams(window.location.search).get('lang')).toBe('es');
  });

  it('W3: lat/lon no hacen esperar a Replay', () => {
    ir('/golf-courses?lat=40.4&lon=-3.7');
    const cargar = vi.fn();
    whenAddressBarIsClean(cargar);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});
