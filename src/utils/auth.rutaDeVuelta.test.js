import { describe, it, expect } from 'vitest';
import { rutaDeVuelta } from './auth';

/**
 * A dónde volver tras entrar (RyderCupAm #749): con la búsqueda, para que el enlace
 * que confirma un correo nuevo (/confirm-email-change?token=…) no pierda su token
 * al pasar por el login.
 */
describe('rutaDeVuelta', () => {
  it('conserva la búsqueda de la ruta de la que venía', () => {
    expect(rutaDeVuelta({ pathname: '/confirm-email-change', search: '?token=abc' })).toBe(
      '/confirm-email-change?token=abc'
    );
  });

  it('sin búsqueda, la ruta tal cual', () => {
    expect(rutaDeVuelta({ pathname: '/stats', search: '' })).toBe('/stats');
  });

  it('sin de dónde venía, o desde el login, al panel', () => {
    expect(rutaDeVuelta(undefined)).toBe('/dashboard');
    expect(rutaDeVuelta({ pathname: '/login', search: '?x=1' })).toBe('/dashboard');
  });

  it('una ruta de otro sitio no sale de la app', () => {
    expect(rutaDeVuelta({ pathname: '//evil.example', search: '' })).toBe('/dashboard');
  });
});
