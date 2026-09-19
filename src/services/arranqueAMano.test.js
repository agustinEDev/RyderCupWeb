import { describe, expect, it } from 'vitest';

import { hayQueArrancarloAMano } from './arranqueAMano';

/**
 * LA TABLA de la FE #630 — un campo sin coordenadas no tiene zona horaria, así
 * que su anotación NO abre sola (BE #305): tiene que arrancarlo el ORGANIZADOR
 * —solo él o un admin pueden—, y con cobertura. Eso hay que decirlo ANTES de
 * que nadie conduzca hasta un campo sin señal.
 *
 *   #   el campo trae…                   | se avisa
 *   ----|---------------------------------|----------
 *   1   una zona                          | no
 *   2   `timezone: null`                  | SÍ
 *   5   ningún `timezone` (dato viejo)    | no: no se sabe, y una falsa alarma
 *       |                                 | manda a alguien a pulsar START sin
 *       |                                 | necesidad, o peor, le hace dudar de
 *       |                                 | un campo que sí abre solo
 */
describe('a qué campos hay que arrancarles la anotación a mano', () => {
  it('1: con zona, no se dice nada', () => {
    expect(hayQueArrancarloAMano({ name: 'Miño Artabro', timezone: 'Europe/Madrid' })).toBe(false);
  });

  it('2: sin zona conocida, sí', () => {
    expect(hayQueArrancarloAMano({ name: 'Pitch Putt', timezone: null })).toBe(true);
  });

  it('5: si el campo ni siquiera viene, NO se avisa: eso es no saberlo', () => {
    // Lo manda un servidor anterior a la BE #305. Avisar aquí sería inventarse
    // una avería que no consta
    expect(hayQueArrancarloAMano({ name: 'De otra versión' })).toBe(false);
    expect(hayQueArrancarloAMano(undefined)).toBe(false);
  });
});
