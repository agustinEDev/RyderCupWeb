import { describe, it, expect } from 'vitest';
import { debeAceptarLosTerminos, TERMINOS_NO_ACEPTADOS } from './aceptacionDeTerminos';

/**
 * Si el usuario tiene que aceptar los Términos antes de seguir (F3).
 *
 * Solo con `false` ESTRICTO: un backend anterior a la aceptación no manda el
 * campo, y bloquear por su ausencia dejaría a todo el mundo fuera.
 */
describe('debeAceptarLosTerminos', () => {
  it.each([
    ['DTO con terms_accepted false', { terms_accepted: false }, true],
    ['DTO con terms_accepted true', { terms_accepted: true }, false],
    ['DTO sin el campo (backend antiguo)', { id: 'u-1' }, false],
    ['DTO con el campo a null', { terms_accepted: null }, false],
    ['entidad con termsAccepted false', { termsAccepted: false }, true],
    ['entidad con termsAccepted true', { termsAccepted: true }, false],
    ['sin usuario', null, false],
    ['sin usuario (undefined)', undefined, false],
    ['un valor que no es booleano', { terms_accepted: 'false' }, false],
  ])('%s → %s', (_caso, usuario, esperado) => {
    expect(debeAceptarLosTerminos(usuario)).toBe(esperado);
  });

  it('el código de error del backend', () => {
    expect(TERMINOS_NO_ACEPTADOS).toBe('TERMS_NOT_ACCEPTED');
  });
});
