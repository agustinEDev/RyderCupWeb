import { describe, expect, it } from 'vitest';

import {
  SIN_HOYOS,
  conHoyosDe,
  conLaColaEncima,
  estaSuperada,
  mismoGolpe,
  turnosDeLosNoGuardados,
} from './vistaDeLaAnotacion';

describe('vistaDeLaAnotacion', () => {
  describe('mismoGolpe', () => {
    it('dados dos golpes con lo mismo, cuando se comparan, entonces son el mismo', () => {
      expect(
        mismoGolpe(
          { ownScore: 4, markedScore: 5 },
          { ownScore: 4, markedScore: 5 },
        ),
      ).toBe(true);
    });

    it('dados dos golpes distintos, cuando se comparan, entonces no son el mismo', () => {
      expect(mismoGolpe({ ownScore: 4 }, { ownScore: 5 })).toBe(false);
    });
  });

  it('dado SIN_HOYOS, entonces está vacío y congelado', () => {
    expect(SIN_HOYOS).toEqual({});
    expect(Object.isFrozen(SIN_HOYOS)).toBe(true);
  });

  describe('conHoyosDe', () => {
    it('dada una vista con hoyos, cuando llega, entonces se quedan los suyos', () => {
      expect(
        conHoyosDe({ holes: [{ n: 2 }] }, { holes: [{ n: 1 }] }).holes,
      ).toEqual([{ n: 2 }]);
    });

    it('dada una vista sin hoyos, cuando llega, entonces conserva los de antes', () => {
      expect(
        conHoyosDe({ matchId: 'm', holes: [] }, { holes: [{ n: 1 }] }),
      ).toEqual({ matchId: 'm', holes: [{ n: 1 }] });
    });

    it('dada una vista sin hoyos y nada antes, cuando llega, entonces se queda sin hoyos', () => {
      expect(conHoyosDe({ matchId: 'm' }, null).holes).toEqual([]);
    });
  });

  describe('estaSuperada', () => {
    const loEnviado = { cuando: 100, scoreData: { ownScore: 4 } };

    it('dada una anotación anterior, cuando se envía otra, entonces está superada', () => {
      expect(
        estaSuperada({ timestamp: 99, scoreData: { ownScore: 9 } }, loEnviado),
      ).toBe(true);
    });

    it('dada una anotación sin hora, cuando se envía otra, entonces cuenta como la más vieja', () => {
      expect(estaSuperada({ scoreData: { ownScore: 9 } }, loEnviado)).toBe(
        true,
      );
    });

    it('dada la misma anotación, cuando se envía, entonces está superada', () => {
      expect(
        estaSuperada({ timestamp: 100, scoreData: { ownScore: 4 } }, loEnviado),
      ).toBe(true);
    });

    it('dada una corrección en el mismo milisegundo, cuando se envía la otra, entonces no está superada', () => {
      expect(
        estaSuperada({ timestamp: 100, scoreData: { ownScore: 5 } }, loEnviado),
      ).toBe(false);
    });

    it('dada una corrección posterior, cuando se envía la anterior, entonces no está superada', () => {
      expect(
        estaSuperada({ timestamp: 101, scoreData: { ownScore: 4 } }, loEnviado),
      ).toBe(false);
    });
  });

  describe('conLaColaEncima', () => {
    const delServidor = [
      {
        holeNumber: 1,
        holeResult: { winner: 'A' },
        playerScores: [
          {
            userId: 'yo',
            ownScore: 4,
            ownSubmitted: true,
            validationStatus: 'match',
            netScore: 3,
          },
          {
            userId: 'rival',
            markerScore: 5,
            markerSubmitted: true,
            markerBy: 'otro',
            markerByName: 'Otro',
          },
        ],
      },
    ];

    it('dada una cola vacía, cuando se pinta, entonces es lo del servidor, el mismo objeto', () => {
      expect(conLaColaEncima(delServidor, [], 'yo')).toBe(delServidor);
    });

    it('dada una anotación sin golpes, cuando se pinta, entonces es lo del servidor, el mismo objeto', () => {
      expect(
        conLaColaEncima(delServidor, [{ holeNumber: 1, scoreData: {} }], 'yo'),
      ).toBe(delServidor);
    });

    it('dada una anotación sin datos, cuando se pinta, entonces no tapa nada', () => {
      expect(conLaColaEncima(delServidor, [{ holeNumber: 1 }], 'yo')).toBe(
        delServidor,
      );
    });

    it('dado el mismo golpe que el servidor, cuando se pinta, entonces la validación sigue valiendo', () => {
      const vista = conLaColaEncima(
        delServidor,
        [{ holeNumber: 1, scoreData: { ownScore: 4 } }],
        'yo',
      );
      expect(vista[0].playerScores[0]).toBe(delServidor[0].playerScores[0]);
    });

    it('dado un golpe propio distinto, cuando se pinta, entonces va encima, pendiente, en cola y sin neto', () => {
      const vista = conLaColaEncima(
        delServidor,
        [{ holeNumber: 1, scoreData: { ownScore: 6 } }],
        'yo',
      );
      expect(vista[0].playerScores[0]).toEqual({
        userId: 'yo',
        ownScore: 6,
        ownSubmitted: true,
        validationStatus: 'pending',
        netScore: null,
        enCola: true,
      });
      expect(vista[0].holeResult).toEqual({ winner: 'A' });
      expect(vista[0].playerScores[1]).toBe(delServidor[0].playerScores[1]);
    });

    it('dada una marca distinta, cuando se pinta, entonces va encima y ya no es del marcador de antes', () => {
      const vista = conLaColaEncima(
        delServidor,
        [
          {
            holeNumber: 1,
            scoreData: { markedPlayerId: 'rival', markedScore: 7 },
          },
        ],
        'yo',
      );
      expect(vista[0].playerScores[1]).toEqual({
        userId: 'rival',
        markerScore: 7,
        markerSubmitted: true,
        markerBy: null,
        markerByName: null,
        validationStatus: 'pending',
        enCola: true,
      });
    });

    it('dado un golpe propio con a quién marco pero sin marca, cuando se pinta, entonces la fila del marcado no se toca', () => {
      const vista = conLaColaEncima(
        delServidor,
        [
          {
            holeNumber: 1,
            scoreData: { ownScore: 6, markedPlayerId: 'rival' },
          },
        ],
        'yo',
      );
      expect(vista[0].playerScores[1]).toBe(delServidor[0].playerScores[1]);
    });

    it('dado el mismo número que el servidor sin que conste anotado, cuando se pinta, entonces va encima pendiente', () => {
      const servidor = [
        {
          holeNumber: 1,
          playerScores: [
            {
              userId: 'rival',
              markerScore: 5,
              markerSubmitted: false,
              validationStatus: 'match',
            },
          ],
        },
      ];
      const vista = conLaColaEncima(
        servidor,
        [
          {
            holeNumber: 1,
            scoreData: { markedPlayerId: 'rival', markedScore: 5 },
          },
        ],
        'yo',
      );
      expect(vista[0].playerScores[0]).toEqual({
        userId: 'rival',
        markerScore: 5,
        markerSubmitted: true,
        validationStatus: 'pending',
        enCola: true,
        markerBy: null,
        markerByName: null,
      });
    });

    it('dada una marca sin a quién, cuando se pinta, entonces no tapa nada', () => {
      expect(
        conLaColaEncima(
          delServidor,
          [{ holeNumber: 1, scoreData: { markedScore: 7 } }],
          'yo',
        ),
      ).toBe(delServidor);
    });

    it('dado un golpe propio sin saber quién soy, cuando se pinta, entonces no tapa nada', () => {
      expect(
        conLaColaEncima(
          delServidor,
          [{ holeNumber: 1, scoreData: { ownScore: 6 } }],
          null,
        ),
      ).toBe(delServidor);
    });

    it('dada una raya (null), cuando se pinta, entonces sí es un golpe', () => {
      const vista = conLaColaEncima(
        delServidor,
        [{ holeNumber: 1, scoreData: { ownScore: null } }],
        'yo',
      );
      expect(vista[0].playerScores[0].ownScore).toBeNull();
      expect(vista[0].playerScores[0].enCola).toBe(true);
    });

    it('dado un hoyo que el servidor no tiene, cuando se pinta, entonces se añade con sus filas', () => {
      const vista = conLaColaEncima(
        delServidor,
        [
          {
            holeNumber: 2,
            scoreData: { ownScore: 5, markedPlayerId: 'rival', markedScore: 4 },
          },
        ],
        'yo',
      );
      expect(vista.map((h) => h.holeNumber)).toEqual([1, 2]);
      expect(vista[0]).toBe(delServidor[0]);
      expect(vista[1]).toEqual({
        holeNumber: 2,
        playerScores: [
          {
            userId: 'yo',
            ownScore: 5,
            ownSubmitted: true,
            validationStatus: 'pending',
            enCola: true,
            netScore: null,
          },
          {
            userId: 'rival',
            markerScore: 4,
            markerSubmitted: true,
            validationStatus: 'pending',
            enCola: true,
            markerBy: null,
            markerByName: null,
          },
        ],
      });
    });

    it('dado un hoyo del servidor sin filas, cuando se pinta, entonces se crean las de la cola', () => {
      const vista = conLaColaEncima(
        [{ holeNumber: 3 }],
        [{ holeNumber: 3, scoreData: { ownScore: 5 } }],
        'yo',
      );
      expect(vista[0].playerScores).toEqual([
        {
          userId: 'yo',
          ownScore: 5,
          ownSubmitted: true,
          validationStatus: 'pending',
          enCola: true,
          netScore: null,
        },
      ]);
    });

    it('dadas dos anotaciones del mismo hoyo, cuando se pintan, entonces manda la última', () => {
      const vista = conLaColaEncima(
        delServidor,
        [
          { holeNumber: 1, scoreData: { ownScore: 6 } },
          { holeNumber: 1, scoreData: { ownScore: 7 } },
        ],
        'yo',
      );
      expect(vista[0].playerScores[0].ownScore).toBe(7);
    });
  });

  describe('turnosDeLosNoGuardados', () => {
    it('dado que no hay hoyos de ese partido, cuando se leen, entonces es SIN_HOYOS', () => {
      expect(turnosDeLosNoGuardados(undefined)).toBe(SIN_HOYOS);
    });

    it('dados golpes sin orden, cuando se leen, entonces van en el orden de siempre y cada marca por rival', () => {
      const hoyos = {
        3: {
          turno: 4,
          golpes: { 'markedScore@u9': 4, ownScore: 2, 'markedScore@u2': 3 },
        },
        5: { turno: 1, golpes: { markedScore: 1 } },
      };
      expect(turnosDeLosNoGuardados(hoyos)).toEqual({
        3: {
          turno: 4,
          golpes: ['ownScore', 'markedScore@u2', 'markedScore@u9'],
        },
        5: { turno: 1, golpes: ['markedScore'] },
      });
    });
  });
});
