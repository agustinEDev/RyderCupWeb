import { describe, it, expect } from 'vitest';
import { faltaElGenero, faltaElHandicap } from './datosQueFaltanSinConexion';

/**
 * Sin red el usuario sale de la copia del dispositivo, que no guarda género ni hándicap
 * (fase 3, FE-06): su ausencia es «no se sabe», no «falta». Con red, como siempre.
 */
describe('datosQueFaltanSinConexion', () => {
  it.each([
    ['con red y sin género', { id: 'u', gender: null }, false, true],
    ['con red y con género', { id: 'u', gender: 'MALE' }, false, false],
    ['sin red (copia reducida)', { id: 'u' }, true, false],
    ['sin usuario', null, false, false],
  ])('género: %s', (_caso, usuario, sinConfirmar, esperado) => {
    expect(faltaElGenero(usuario, sinConfirmar)).toBe(esperado);
  });

  it.each([
    ['con red y sin hándicap', { id: 'u', handicap: null }, false, true],
    ['con red, campo ausente', { id: 'u' }, false, true],
    ['con red y con hándicap 0', { id: 'u', handicap: 0 }, false, false],
    ['sin red (copia reducida)', { id: 'u' }, true, false],
    ['sin usuario', null, false, false],
  ])('hándicap: %s', (_caso, usuario, sinConfirmar, esperado) => {
    expect(faltaElHandicap(usuario, sinConfirmar)).toBe(esperado);
  });
});

describe('la ficha de la competición usa la regla (cableado)', () => {
  // La ficha es enorme para montarla aquí: se comprueba que el aviso de «falta el
  // hándicap» pasa por la regla con `sinConfirmar`, no por la comprobación de antes
  const ficha = Object.values(
    import.meta.glob('/src/pages/CompetitionDetail.jsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  )[0];

  it('faltaHandicap sale de faltaElHandicap(user, sinConfirmar)', () => {
    expect(ficha).toMatch(
      /faltaHandicap=\{esStrokePlay && faltaElHandicap\(user, sinConfirmar\)\}/,
    );
    expect(ficha).toMatch(
      /const \{ user, loading: isLoadingUser, sinConfirmar \} = useAuth\(\);/,
    );
  });
});
