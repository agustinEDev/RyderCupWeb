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
import { esFalloDeRed } from './sinCobertura';

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
