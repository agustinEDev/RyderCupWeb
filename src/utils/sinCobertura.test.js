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
import { esFalloDeRed, esFalloDeRedDeLaApi, mensajeDeError } from './sinCobertura';

const fingeConexion = (hay) =>
  Object.defineProperty(globalThis.navigator, 'onLine', { value: hay, configurable: true });

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
      'FetchEvent.respondWith received an error: no-response'
    );

    expect(esFalloDeRed(delServiceWorker)).toBe(true);
  });

  it('un error del servidor NO se disfraza de falta de cobertura', () => {
    // Si no, un fallo del backend se contaba como «no hay red» y nadie se
    // enteraba de que había algo roto
    fingeConexion(true);

    expect(esFalloDeRed(Object.assign(new Error('boom'), { status: 500 }))).toBe(false);
  });

  it('pero en modo avión cuenta, sea cual sea el error', () => {
    fingeConexion(false);

    expect(esFalloDeRed(new Error('lo que sea'))).toBe(true);
  });
});

describe('mensajeDeError · un fallo del servidor (FE #710)', () => {
  const textos = { sinConexion: 'sin red', generico: 'algo ha fallado' };

  it.each([500, 502, 503])('un %i dice que algo ha fallado, no su texto crudo', (status) => {
    fingeConexion(true);
    const error = Object.assign(new Error('Internal Server Error'), { status });

    expect(mensajeDeError(error, textos)).toBe('algo ha fallado');
  });

  it('un 4xx sigue diciendo su motivo', () => {
    fingeConexion(true);
    const error = Object.assign(new Error('El torneo ya ha empezado'), { status: 499 });

    expect(mensajeDeError(error, textos)).toBe('El torneo ya ha empezado');
  });
});

/**
 * La versión estricta: solo lo que `api.js` marcó como falta de red —el
 * `TypeError` que envuelve el de `fetch` en `cause`— o el navegador sin red.
 * Un `TypeError` del código (leer `.valid` de un cuerpo `null`) no lo es.
 */
describe('esFalloDeRedDeLaApi', () => {
  afterEach(() => fingeConexion(true));

  it('el TypeError que marca api.js, con el de fetch en cause, es falta de red', () => {
    fingeConexion(true);
    const marcado = new TypeError('common:sinConexion.mensaje', {
      cause: new TypeError('Failed to fetch'),
    });

    expect(esFalloDeRedDeLaApi(marcado)).toBe(true);
  });

  it('un TypeError del código, sin cause, NO es falta de red', () => {
    fingeConexion(true);

    expect(esFalloDeRedDeLaApi(new TypeError("Cannot read properties of null (reading 'valid')"))).toBe(false);
  });

  it('un Error con cause tampoco: solo cuenta el TypeError', () => {
    fingeConexion(true);

    expect(esFalloDeRedDeLaApi(new Error('x', { cause: new Error('y') }))).toBe(false);
  });

  it('sin red en el navegador sí, aunque el error no lo parezca', () => {
    fingeConexion(false);

    expect(esFalloDeRedDeLaApi(new SyntaxError('Unexpected token <'))).toBe(true);
  });
});
