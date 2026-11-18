/**
 * LA TABLA — qué cuenta como quedarse sin red.
 *
 *   caso                              | ¿es falta de red?
 *   ----------------------------------|-------------------------------------
 *   `TypeError` de `fetch`             | sí: no hubo respuesta
 *   el service worker no puede servir  | sí: llega igual, como `TypeError`
 *   un Error cualquiera                | no: es del código o del servidor
 *   el navegador dice que no hay red   | sí, aunque el error no lo parezca
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  esFalloDeRed,
  esFalloDeRedDeLaApi,
  mensajeDeError,
  motivoDelError,
} from './sinCobertura';

const fingeConexion = (hay) =>
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: hay,
    configurable: true,
  });

describe('esFalloDeRed', () => {
  afterEach(() => fingeConexion(true));

  it('un TypeError de fetch es falta de red', () => {
    fingeConexion(true);

    expect(esFalloDeRed(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('y el aviso del service worker también, que llega igual', () => {
    // Es lo que se veía en rojo dentro del formulario, con la URL de la API
    fingeConexion(true);
    const delServiceWorker = new TypeError(
      'FetchEvent.respondWith received an error: no-response',
    );

    expect(esFalloDeRed(delServiceWorker)).toBe(true);
  });

  it('un error del servidor NO se disfraza de falta de cobertura', () => {
    // Si no, un fallo del backend se contaba como «no hay red» y nadie se
    // enteraba de que había algo roto
    fingeConexion(true);

    expect(
      esFalloDeRed(Object.assign(new Error('boom'), { status: 500 })),
    ).toBe(false);
  });

  it('pero en modo avión cuenta, sea cual sea el error', () => {
    fingeConexion(false);

    expect(esFalloDeRed(new Error('lo que sea'))).toBe(true);
  });

  it('y el error que api.js marca sin conexión, aunque no sea un TypeError', () => {
    // El tope vencido y el cuerpo cortado llegan marcados: lo dice la marca
    fingeConexion(true);

    expect(
      esFalloDeRed(Object.assign(new Error('x'), { sinConexion: true })),
    ).toBe(true);
  });
});

describe('mensajeDeError · un fallo del servidor (FE #710)', () => {
  const textos = { sinConexion: 'sin red', generico: 'algo ha fallado' };

  it.each([500, 502, 503])(
    'un %i dice que algo ha fallado, no su texto crudo',
    (status) => {
      fingeConexion(true);
      const error = Object.assign(new Error('Internal Server Error'), {
        status,
      });

      expect(mensajeDeError(error, textos)).toBe('algo ha fallado');
    },
  );

  it('un 4xx sigue diciendo su motivo', () => {
    fingeConexion(true);
    const error = Object.assign(new Error('El torneo ya ha empezado'), {
      status: 499,
    });

    expect(mensajeDeError(error, textos)).toBe('El torneo ya ha empezado');
  });

  // Re-auditoría Q-FE-06: la misma regla que `mensajeDelError`, no otra
  const http = (status, mensaje, extra = {}) =>
    Object.assign(new Error(mensaje), { status, ...extra });

  it.each([
    [
      'a technical 422 list',
      http(422, 'Field required', { mensajeTecnico: true }),
    ],
    ['a 401', http(401, 'Token inválido o expirado')],
    ['a JSON body', http(400, '{"detail":"x"}')],
    ['a bare code', http(409, 'FAILED_TO_REVOKE_DEVICE')],
    [
      'a refresh failure with its status in .response',
      Object.assign(new Error('Refresh token expired'), {
        response: { status: 401 },
      }),
    ],
  ])('%s is not a reason to show: the generic text', (_caso, error) => {
    fingeConexion(true);

    expect(motivoDelError(error)).toBe('generico');
    expect(mensajeDeError(error, textos)).toBe('algo ha fallado');
  });

  it('the text api.js already translated (429) is shown', () => {
    fingeConexion(true);
    const error = http(429, 'Demasiados intentos, espera un minuto', {
      mensajeTraducido: true,
    });

    expect(motivoDelError(error)).toEqual({
      delServidor: 'Demasiados intentos, espera un minuto',
    });
  });

  it('a code failure is never shown', () => {
    fingeConexion(true);
    const error = new RangeError('Invalid time value');

    expect(motivoDelError(error)).toBe('generico');
  });
});

/**
 * La versión estricta: solo lo que `api.js` marcó como falta de red —con
 * `sinConexion: true`: el fallo de `fetch`, su tope y el cuerpo cortado— o el
 * navegador sin red. Un `TypeError` sin marca no lo es, traiga o no `cause`.
 */
describe('esFalloDeRedDeLaApi', () => {
  afterEach(() => fingeConexion(true));

  it('el error que marca api.js es falta de red', () => {
    fingeConexion(true);
    const marcado = Object.assign(
      new TypeError('common:sinConexion.mensaje', {
        cause: new TypeError('Failed to fetch'),
      }),
      { sinConexion: true },
    );

    expect(esFalloDeRedDeLaApi(marcado)).toBe(true);
  });

  it('un TypeError del código, sin marca, NO es falta de red', () => {
    fingeConexion(true);

    expect(
      esFalloDeRedDeLaApi(
        new TypeError("Cannot read properties of null (reading 'valid')"),
      ),
    ).toBe(false);
  });

  it('un TypeError con cause pero sin la marca tampoco', () => {
    fingeConexion(true);

    expect(
      esFalloDeRedDeLaApi(
        new TypeError('x', { cause: new TypeError('Failed to fetch') }),
      ),
    ).toBe(false);
  });

  it('una marca que no es true no cuenta', () => {
    fingeConexion(true);

    expect(
      esFalloDeRedDeLaApi(
        Object.assign(new TypeError('x'), { sinConexion: 'sí' }),
      ),
    ).toBe(false);
  });

  it('sin red en el navegador sí, aunque el error no lo parezca', () => {
    fingeConexion(false);

    expect(esFalloDeRedDeLaApi(new SyntaxError('Unexpected token <'))).toBe(
      true,
    );
  });

  it('con null o undefined no revienta', () => {
    fingeConexion(true);

    expect(esFalloDeRedDeLaApi(null)).toBe(false);
    expect(esFalloDeRedDeLaApi(undefined)).toBe(false);
    expect(esFalloDeRed(null)).toBe(false);
  });
});

describe('motivoDelError · la misma regla, sin textos (4 nov 2026)', () => {
  it.each([
    ['sin red', new TypeError('Failed to fetch'), 'sinConexion'],
    ['un 5xx', { status: 503, message: 'Service Unavailable' }, 'generico'],
    [
      'un 4xx con motivo',
      Object.assign(new Error('Ya es participante'), { status: 409 }),
      { delServidor: 'Ya es participante' },
    ],
    ['un 4xx sin motivo', { status: 400 }, 'generico'],
    ['sin estado', new Error('boom'), 'generico'],
  ])('%s', (_, err, esperado) => {
    expect(motivoDelError(err)).toEqual(esperado);
  });
});
