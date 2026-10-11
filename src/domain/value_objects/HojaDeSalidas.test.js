import { afterEach, vi, describe, it, expect } from 'vitest';
import { errorDeHoja, errorDeLaFranja, numeroDeSalidas, cupoDeLaHoja, hojaPropuesta } from './HojaDeSalidas';

/**
 * La hoja de salidas de una franja (FE #824, RyderCupAm#251): las mismas reglas
 * que el backend, para avisar antes de enviar. La hora final ES la última
 * salida: 15:00-18:00 cada 10 min son 19 salidas.
 */
const hoja = (extra = {}) => ({ primera: '08:00', ultima: '11:50', intervalo: 10, tamano: 4, ...extra });

describe('HojaDeSalidas (FE #824)', () => {
  describe('D3: las reglas', () => {
    it.each([
      [hoja(), null],
      [hoja({ ultima: '08:00' }), null],
      [hoja({ intervalo: 5 }), null],
      [hoja({ intervalo: 20 }), null],
      [hoja({ tamano: 3 }), null],
      [hoja({ ultima: '07:50' }), 'lastBeforeFirst'],
      [hoja({ intervalo: 4 }), 'intervalRange'],
      [hoja({ intervalo: 21 }), 'intervalRange'],
      [hoja({ intervalo: 7.5 }), 'intervalRange'],
      [hoja({ intervalo: NaN }), 'intervalRange'],
      [hoja({ tamano: 2 }), 'groupSize'],
      [hoja({ tamano: 5 }), 'groupSize'],
      [hoja({ primera: '' }), 'teeTimeFormat'],
      [hoja({ ultima: '8:00' }), 'teeTimeFormat'],
      [hoja({ primera: '24:00' }), 'teeTimeFormat'],
      [hoja({ primera: '08:60' }), 'teeTimeFormat'],
    ])('%o → %s', (h, error) => {
      expect(errorDeHoja(h)).toBe(error);
    });
  });

  describe('salidas y cupo', () => {
    it.each([
      [hoja({ primera: '15:00', ultima: '18:00', intervalo: 10 }), 19],
      [hoja({ primera: '08:00', ultima: '11:50', intervalo: 10 }), 24],
      [hoja({ primera: '08:00', ultima: '08:00' }), 1],
      // La última que cabe: de 9:00 a 9:25 cada 10 son 9:00, 9:10 y 9:20
      [hoja({ primera: '09:00', ultima: '09:25', intervalo: 10 }), 3],
      [hoja({ primera: '18:00', ultima: '23:50', intervalo: 10 }), 36],
    ])('%o → %s salidas', (h, salidas) => {
      expect(numeroDeSalidas(h)).toBe(salidas);
    });

    it('el cupo es salidas por jugadores de cada partida', () => {
      expect(cupoDeLaHoja(hoja({ tamano: 3 }))).toBe(72);
      expect(cupoDeLaHoja(hoja())).toBe(96);
    });

    it('una hoja imposible no tiene salidas ni cupo', () => {
      expect(numeroDeSalidas(hoja({ intervalo: 0 }))).toBe(0);
      expect(cupoDeLaHoja(hoja({ ultima: '07:00' }))).toBe(0);
    });
  });

  describe('los valores propuestos (Agustín, 10 oct 2026)', () => {
    it.each([
      ['MORNING', '08:00', '11:50'],
      ['AFTERNOON', '12:00', '17:50'],
      ['EVENING', '18:00', '23:50'],
    ])('%s: de %s a %s, cada 10 min, partidas de 4', (franja, primera, ultima) => {
      expect(hojaPropuesta(franja)).toEqual({ primera, ultima, intervalo: 10, tamano: 4 });
    });
  });
});

describe('errorDeLaFranja: su primera salida ya pasó (QA del 11 oct 2026)', () => {
  const hoja = { primera: '09:00', ultima: '12:00', intervalo: 10, tamano: 4 };
  // El reloj del móvil, en su hora local (la del campo, casi siempre)
  const a = (hora) => new Date(2030, 9, 12, ...hora.split(':').map(Number));

  it.each([
    ['08:59', null],
    ['09:00', 'firstTeePassed'],
    ['15:00', 'firstTeePassed'],
  ])('hoy a las %s, una franja de las 9:00 da %s', (ahora, error) => {
    expect(errorDeLaFranja({ dia: '2030-10-12', hoja }, a(ahora))).toBe(error);
  });

  it('mañana, aunque sea antes en el reloj, no ha pasado', () => {
    expect(errorDeLaFranja({ dia: '2030-10-13', hoja }, a('15:00'))).toBeNull();
  });

  it('cambiar otra cosa de una ya empezada vale: su primera salida no cambia', () => {
    expect(errorDeLaFranja({ dia: '2030-10-12', hoja, primeraAntes: '09:00' }, a('15:00'))).toBeNull();
  });

  it('cambiarla a otra hora ya pasada, no', () => {
    expect(errorDeLaFranja({ dia: '2030-10-12', hoja, primeraAntes: '16:00' }, a('15:00'))).toBe('firstTeePassed');
  });

  it('un error de la hoja va antes', () => {
    expect(errorDeLaFranja({ dia: '2030-10-12', hoja: { ...hoja, intervalo: 3 } }, a('15:00'))).toBe('intervalRange');
  });

  it('sin día, solo la hoja', () => {
    expect(errorDeLaFranja({ dia: null, hoja }, a('15:00'))).toBeNull();
  });
});

/**
 * El cambio de hora de primavera (2.ª pasada del QA, 12 oct 2026): el 28 de
 * marzo de 2027 en Madrid se pasa de las 2:00 a las 3:00. Una salida en ese
 * hueco no existe, y el formulario lo dice antes de guardar.
 *
 *   hoja (28/03/2027, Madrid)  | resultado
 *   ---------------------------|----------------
 *   02:30-03:30                | teeTimeSkipped (la primera)
 *   01:50-04:00                | teeTimeSkipped (las de en medio)
 *   01:00-02:00                | teeTimeSkipped (la última, justo en el salto)
 *   01:00-01:50                | nada
 *   03:00-04:00                | nada
 *   otro día, 01:50-04:00      | nada
 *   en una zona sin cambio     | nada
 */
describe('errorDeLaFranja: salidas que no existen por el cambio de hora', () => {
  const hoja = (primera, ultima) => ({ primera, ultima, intervalo: 10, tamano: 4 });
  const ANTES = new Date(Date.UTC(2027, 0, 1));
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['02:30', '03:30', 'teeTimeSkipped'],
    ['01:50', '04:00', 'teeTimeSkipped'],
    ['01:00', '02:00', 'teeTimeSkipped'],
    ['01:00', '01:50', null],
    ['03:00', '04:00', null],
  ])('en Madrid, de %s a %s: %s', (primera, ultima, error) => {
    vi.stubEnv('TZ', 'Europe/Madrid');

    expect(errorDeLaFranja({ dia: '2027-03-28', hoja: hoja(primera, ultima) }, ANTES)).toBe(error);
  });

  it('otro día, nada', () => {
    vi.stubEnv('TZ', 'Europe/Madrid');

    expect(errorDeLaFranja({ dia: '2027-03-27', hoja: hoja('01:50', '04:00') }, ANTES)).toBeNull();
  });

  it('en una zona sin cambio de hora, nada', () => {
    vi.stubEnv('TZ', 'UTC');

    expect(errorDeLaFranja({ dia: '2027-03-28', hoja: hoja('01:50', '04:00') }, ANTES)).toBeNull();
  });

  it('también al cambiar una sin tocar su primera salida', () => {
    vi.stubEnv('TZ', 'Europe/Madrid');

    expect(errorDeLaFranja({ dia: '2027-03-28', hoja: hoja('01:50', '04:00'), primeraAntes: '01:50' }, ANTES)).toBe('teeTimeSkipped');
  });
});
