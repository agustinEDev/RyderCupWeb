import { describe, it, expect } from 'vitest';
import { instanteDeLaApi } from './instanteDeLaApi';

/**
 * La API manda parte de sus horas sin huso (`datetime.now()` en un servidor en
 * UTC), y el navegador las lee como hora local (FE #710). Algo creado el 24 a
 * las 01:55 en España llegaba como «2026-09-23T23:55:00» y se pintaba el 23.
 */
describe('instanteDeLaApi', () => {
  it.each([
    ['sin huso: es UTC', '2026-09-23T23:55:00', '2026-09-23T23:55:00.000Z'],
    ['sin huso y con microsegundos', '2026-09-23T23:55:00.123456', '2026-09-23T23:55:00.123Z'],
    ['con Z se respeta', '2026-09-23T23:55:00Z', '2026-09-23T23:55:00.000Z'],
    ['con desfase se respeta', '2026-09-24T01:55:00+02:00', '2026-09-23T23:55:00.000Z'],
    ['con desfase negativo', '2026-09-23T18:55:00-05:00', '2026-09-23T23:55:00.000Z'],
    ['un día sin hora, como siempre', '2026-09-23', '2026-09-23T00:00:00.000Z'],
  ])('%s', (_caso, texto, esperado) => {
    expect(instanteDeLaApi(texto).toISOString()).toBe(esperado);
  });

  it('lo que no es texto se trata como antes', () => {
    const fecha = new Date('2026-09-23T23:55:00Z');
    expect(instanteDeLaApi(fecha).getTime()).toBe(fecha.getTime());
    expect(Number.isNaN(instanteDeLaApi(undefined).getTime())).toBe(true);
  });
});
