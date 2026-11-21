import { describe, it, expect } from 'vitest';
import { claveDelFalloDeLaBarra } from './falloDeLaBarra';

const fallo = (status, errorCode) =>
  Object.assign(new Error(String(status)), { status, errorCode });

/** F4: cada rechazo con su texto, nunca el del servidor. */
describe('claveDelFalloDeLaBarra', () => {
  it.each([
    [fallo(422, 'TEE_NOT_AVAILABLE'), 'TEE_NOT_AVAILABLE'],
    [fallo(409, 'TEE_CHANGE_CLOSED'), 'TEE_CHANGE_CLOSED'],
    [fallo(409, 'ENROLLMENT_NOT_APPROVED'), 'ENROLLMENT_NOT_APPROVED'],
    [
      fallo(409, 'PENDING_GAME_NOT_RECALCULABLE'),
      'PENDING_GAME_NOT_RECALCULABLE',
    ],
    [fallo(404, 'COURSE_NOT_IN_COMPETITION'), 'COURSE_NOT_IN_COMPETITION'],
    [fallo(403, undefined), 'FORBIDDEN'],
    [fallo(409, 'OTRO_CODIGO'), 'generic'],
    [new Error('sin red'), 'generic'],
    [null, 'generic'],
  ])('%s → %s', (error, clave) => {
    expect(claveDelFalloDeLaBarra(error)).toBe(
      `competitions:tees.errors.${clave}`,
    );
  });
});
