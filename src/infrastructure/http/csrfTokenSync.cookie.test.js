/**
 * Qué token CSRF se manda (hotfix 2.63.1, pasada del iPhone del 4 nov 2026).
 *
 * El servidor compara la cabecera con la cookie `csrf_token`, y cada refresco
 * la rota. Se mandaba la copia en memoria, y la memoria se queda atrás cuando
 * otra pestaña —o un refresco que se cruza con otro— cambia la cookie: 403 y
 * fuera de la aplicación. La cookie es la que el servidor va a mirar.
 *
 *   #  cookie                     | memoria | se manda
 *   ---|--------------------------|---------|-----------------------------
 *   1  A                          | A       | A
 *   2  B (otra pestaña refrescó)  | A       | B
 *   3  sin cookie                 | A       | A
 *   4  sin cookie                 | nada    | null
 *   5  dos `csrf_token`: A y B    | —       | B (Starlette se queda la última)
 *   6  `csrf_token=` vacía        | A       | A
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCsrfToken, setCsrfTokenGlobal } from './csrfTokenSync';

const ponLasCookies = (valor) => {
  vi.spyOn(document, 'cookie', 'get').mockReturnValue(valor);
};

describe('getCsrfToken: la cookie manda', () => {
  beforeEach(() => {
    setCsrfTokenGlobal(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    setCsrfTokenGlobal(null);
    vi.restoreAllMocks();
  });

  it('1: cookie y memoria iguales, ese', () => {
    ponLasCookies('csrf_token=AAA');
    setCsrfTokenGlobal('AAA');

    expect(getCsrfToken()).toBe('AAA');
  });

  it('2: otra pestaña rotó la cookie: el de la cookie, no el de memoria', () => {
    ponLasCookies('otra=1; csrf_token=NUEVO');
    setCsrfTokenGlobal('VIEJO');

    expect(getCsrfToken()).toBe('NUEVO');
  });

  it('3: sin cookie, el de memoria', () => {
    ponLasCookies('otra=1');
    setCsrfTokenGlobal('AAA');

    expect(getCsrfToken()).toBe('AAA');
  });

  it('4: ni cookie ni memoria, null', () => {
    ponLasCookies('');

    expect(getCsrfToken()).toBeNull();
  });

  it('5: con dos cookies, la última, que es la que lee el servidor', () => {
    ponLasCookies('csrf_token=PRIMERA; otra=1; csrf_token=SEGUNDA');
    setCsrfTokenGlobal('MEMORIA');

    expect(getCsrfToken()).toBe('SEGUNDA');
  });

  it('6: una cookie vacía no cuenta: el de memoria', () => {
    ponLasCookies('csrf_token=; otra=1');
    setCsrfTokenGlobal('AAA');

    expect(getCsrfToken()).toBe('AAA');
  });

  it('un token con «=» de relleno se lee entero', () => {
    ponLasCookies('csrf_token=abc==');

    expect(getCsrfToken()).toBe('abc==');
  });

  it('una cookie que solo empieza igual (`csrf_token_x`) no es la nuestra', () => {
    ponLasCookies('csrf_token_x=OTRA');
    setCsrfTokenGlobal('AAA');

    expect(getCsrfToken()).toBe('AAA');
  });
});
