import { describe, it, expect } from 'vitest';
import { errorDeHoja, numeroDeSalidas, cupoDeLaHoja, hojaPropuesta } from './HojaDeSalidas';

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
