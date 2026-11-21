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
    [fallo(422, 'TEE_NOT_ON_PENDING_COURSE'), 'TEE_NOT_ON_PENDING_COURSE'],
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

describe('claveDelFalloDeLaBarra · la barra de un campo para un género', () => {
  it('TEE_NOT_AVAILABLE con su texto propio; lo demás, como siempre', () => {
    expect(
      claveDelFalloDeLaBarra(fallo(422, 'TEE_NOT_AVAILABLE'), {
        delCampo: true,
      }),
    ).toBe('competitions:tees.courses.errors.TEE_NOT_AVAILABLE');
    expect(claveDelFalloDeLaBarra(fallo(403), { delCampo: true })).toBe(
      'competitions:tees.errors.FORBIDDEN',
    );
  });
});

describe('claveDelFalloDeLaBarra · al quitar una barra', () => {
  it('TEE_NOT_AVAILABLE al quitar: no se puede quitar, sea del jugador o del campo', () => {
    const error = fallo(422, 'TEE_NOT_AVAILABLE');
    expect(claveDelFalloDeLaBarra(error, { quitando: true })).toBe(
      'competitions:tees.errors.cantRemove',
    );
    expect(
      claveDelFalloDeLaBarra(error, { quitando: true, delCampo: true }),
    ).toBe('competitions:tees.errors.cantRemove');
  });

  it('otro código al quitar, el suyo', () => {
    expect(
      claveDelFalloDeLaBarra(fallo(409, 'TEE_CHANGE_CLOSED'), {
        quitando: true,
      }),
    ).toBe('competitions:tees.errors.TEE_CHANGE_CLOSED');
  });
});
