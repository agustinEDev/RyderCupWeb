import { describe, it, expect } from 'vitest';
import { fechaLocal } from './fechaLocal';

/**
 * LA TABLA — qué día es hoy (FE #615, fila 11).
 *
 *   caso                                   | qué da
 *   ---------------------------------------|---------------------------------
 *   una hora cualquiera                    | el día del calendario local
 *   pasada la medianoche local, antes de   | el día NUEVO: `toISOString` da el
 *   que lo sea en UTC                      | de ayer hasta las dos en España
 *   un mes o un día de una cifra           | con su cero delante, para comparar
 *                                          | como texto con `roundDate`
 */
describe('fechaLocal', () => {
  it('da el día del calendario local', () => {
    expect(fechaLocal(new Date(2026, 8, 17, 12, 0))).toBe('2026-09-17');
  });

  it('pasada la medianoche local ya es el día nuevo, aunque en UTC no lo sea', () => {
    // Una fecha que en UTC todavía es ayer, sin depender del huso de la
    // máquina: el CI corre en UTC y ahí una fecha real no distinguiría nada
    const madrugadaEnMadrid = {
      getFullYear: () => 2026,
      getMonth: () => 8,
      getDate: () => 17,
      toISOString: () => '2026-09-16T22:30:00.000Z',
    };

    expect(fechaLocal(madrugadaEnMadrid)).toBe('2026-09-17');
  });

  it('lleva los ceros delante: se compara como texto con la fecha de la ronda', () => {
    expect(fechaLocal(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });
});
