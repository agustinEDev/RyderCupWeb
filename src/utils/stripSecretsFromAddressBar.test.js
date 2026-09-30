import { describe, it, expect, afterEach, vi } from 'vitest';
import { stripSecretsFromAddressBar } from './stripSecretsFromAddressBar';

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
    expect(window.history.state).toEqual({ idx: 3, key: 'k' });
  });
});
