import { describe, expect, it } from 'vitest';

import ScheduleMapper from './ScheduleMapper';

/**
 * La hora de apertura de la anotación (BE #305, FE #621) tiene TRES estados, y
 * el mapper tiene que conservarlos, porque `sePuedeAnotar` decide distinto con
 * cada uno:
 *
 *   valor              | qué significa                    | qué se ofrece
 *   -------------------|----------------------------------|------------------
 *   una fecha          | el campo abre a esa hora          | anotar desde ella
 *   null               | campo sin coordenadas: no abre solo| solo con START, y
 *                      |                                   | lo de hoy sin red
 *   el campo no viene  | servidor anterior a la BE #305    | la regla de «hoy»
 *
 * Aplanar los dos últimos con `?? null` parecía inofensivo y no lo era: si este
 * frontend se despliega antes que su backend —que es el orden contrario al
 * habitual, pero pasa—, TODO partido llega sin el campo, y tomarlo por «no abre
 * solo» dejaba sin botón de anotar al que se va al campo sin cobertura.
 */
const apiMatch = (extra = {}) => ({
  id: 'm-1',
  round_id: 'r-1',
  match_number: 1,
  team_a_players: [],
  team_b_players: [],
  status: 'SCHEDULED',
  created_at: '2026-09-18T10:00:00Z',
  updated_at: '2026-09-18T10:00:00Z',
  ...extra,
});

describe('ScheduleMapper · la hora a la que abre la anotación', () => {
  it('la trae cuando el servidor la manda', () => {
    const dto = ScheduleMapper.toMatchDTO(apiMatch({ scoring_opens_at: '2026-09-19T06:00:00+02:00' }));

    expect(dto.scoringOpensAt).toBe('2026-09-19T06:00:00+02:00');
  });

  it('respeta el vacío: ese campo no tiene coordenadas', () => {
    const dto = ScheduleMapper.toMatchDTO(apiMatch({ scoring_opens_at: null }));

    expect('scoringOpensAt' in dto).toBe(true);
    expect(dto.scoringOpensAt).toBeNull();
  });

  it('y NO se inventa un vacío cuando el servidor no manda el campo', () => {
    const dto = ScheduleMapper.toMatchDTO(apiMatch());

    expect('scoringOpensAt' in dto).toBe(false);
  });
});
