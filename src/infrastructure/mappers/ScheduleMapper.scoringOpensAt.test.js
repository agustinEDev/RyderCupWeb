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
 *
 * Y el dato viaja en la RONDA, no en cada partido. Se comprobó contra el Kind,
 * después de haberlo supuesto mal: un `grep` decía en qué fichero de DTOs vivía
 * el campo, no a qué DTO pertenecía, y los tests pasaban porque la respuesta de
 * ejemplo me la había inventado yo.
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

const apiRound = (extra = {}) => ({
  id: 'r-1',
  competition_id: 'c-1',
  golf_course_id: 'gc-1',
  round_date: '2026-09-19',
  session_type: 'MORNING',
  match_format: 'SINGLES',
  status: 'SCHEDULED',
  matches: [apiMatch()],
  ...extra,
});

describe('ScheduleMapper · la hora a la que abre la anotación', () => {
  it('la trae de la RONDA, que es donde la manda el servidor', () => {
    const dto = ScheduleMapper.toRoundDTO(apiRound({ scoring_opens_at: '2026-09-19T06:00:00+02:00' }));

    expect(dto.scoringOpensAt).toBe('2026-09-19T06:00:00+02:00');
  });

  it('respeta el vacío: ese campo no tiene coordenadas', () => {
    const dto = ScheduleMapper.toRoundDTO(apiRound({ scoring_opens_at: null }));

    expect('scoringOpensAt' in dto).toBe(true);
    expect(dto.scoringOpensAt).toBeNull();
  });

  it('y NO se inventa un vacío cuando el servidor no manda el campo', () => {
    const dto = ScheduleMapper.toRoundDTO(apiRound());

    expect('scoringOpensAt' in dto).toBe(false);
  });

  it('el partido no la lleva ni aunque alguien la meta ahí: buscarla ahí fue el fallo', () => {
    // Con `apiMatch()` a secas este test pasaba con el defecto dentro, porque
    // el ejemplo tampoco traía el campo. Hay que dárselo para que signifique algo
    const dto = ScheduleMapper.toMatchDTO(apiMatch({ scoring_opens_at: '2026-09-19T06:00:00+02:00' }));

    expect('scoringOpensAt' in dto).toBe(false);
  });

  // 3) Y por el punto de entrada de verdad: el fallo de la #631 fue de NIVEL de
  // la respuesta, y un test que llama a `toRoundDTO` a pelo da por bueno el
  // nivel que crea quien lo escribe. Este atraviesa el sobre `days[]` entero
  it('y por el camino real, con el sobre de días que manda el servidor', () => {
    const dto = ScheduleMapper.toScheduleDTO({
      competition_id: 'c-1',
      days: [{
        date: '2026-09-19',
        rounds: [apiRound({ scoring_opens_at: '2026-09-19T06:00:00+02:00' })],
      }],
    });

    expect(dto.rounds[0].scoringOpensAt).toBe('2026-09-19T06:00:00+02:00');
    expect('scoringOpensAt' in dto.rounds[0].matches[0]).toBe(false);
  });
});
