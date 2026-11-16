import { describe, it, expect } from 'vitest';
import perfilEs from './locales/es/profile.json';
import perfilEn from './locales/en/profile.json';

/**
 * El 503 de subir el avatar con otras imágenes en proceso (IMAGES_BUSY): en
 * español, el mismo texto que manda el servidor; en inglés, el suyo.
 */
describe('el texto de las imágenes ocupadas', () => {
  it.each([
    [
      'es',
      perfilEs,
      'Ahora mismo se están procesando otras imágenes. Inténtalo de nuevo en unos segundos.',
    ],
    [
      'en',
      perfilEn,
      'Other images are being processed right now. Try again in a few seconds.',
    ],
  ])('en %s dice lo que tiene que decir', (_, perfil, texto) => {
    // Given los textos del perfil
    // Then el del 503 es ese
    expect(perfil.toasts.avatarImagesBusy).toBe(texto);
  });
});
