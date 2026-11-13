import { describe, expect, it } from 'vitest';

import { hoyosSinGuardar, lecturaDelHoyo } from './lecturaDelHoyo';

const bloqueadaPara = (entregadas) => (id) => !id || entregadas.includes(id);

describe('lecturaDelHoyo', () => {
  describe('hoyosSinGuardar', () => {
    const markerAssignments = [
      { scorerUserId: 'yo', marksUserId: 'r1' },
      { scorerUserId: 'yo', marksUserId: 'r2' },
      { scorerUserId: 'otro', marksUserId: 'yo' },
    ];

    it('dados hoyos sin guardar, cuando se leen, entonces van en orden y separan los que aún se pueden anotar', () => {
      const r = hoyosSinGuardar({
        noGuardados: {
          9: { golpes: ['ownScore'] },
          3: { golpes: ['markedScore@r2'] },
          5: { golpes: ['markedScore@r1'] },
        },
        markerAssignments,
        userId: 'yo',
        canScore: true,
        isOwnScoreLocked: true,
        marcaBloqueadaPara: bloqueadaPara(['r1']),
      });
      expect(r).toEqual({
        hoyosNoGuardados: [3, 5, 9],
        primerMarcado: 'r1',
        segundoMarcado: 'r2',
        porAnotar: [3],
        sinAnotar: [5, 9],
      });
    });

    it('dada una marca sin rival, cuando se lee, entonces se bloquea con el primer marcado', () => {
      const r = hoyosSinGuardar({
        noGuardados: { 4: { golpes: ['markedScore'] } },
        markerAssignments,
        userId: 'yo',
        canScore: true,
        isOwnScoreLocked: false,
        marcaBloqueadaPara: bloqueadaPara(['r1']),
      });
      expect(r.sinAnotar).toEqual([4]);
    });

    it('dada la marca de quien ya no marco, cuando se lee, entonces ya no se anota', () => {
      const r = hoyosSinGuardar({
        noGuardados: { 4: { golpes: ['markedScore@r9'] } },
        markerAssignments,
        userId: 'yo',
        canScore: true,
        isOwnScoreLocked: false,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(r.sinAnotar).toEqual([4]);
    });

    it('dado quien no puede anotar, cuando se lee, entonces nada se pide volver a anotar', () => {
      const r = hoyosSinGuardar({
        noGuardados: { 2: { golpes: ['ownScore'] } },
        markerAssignments: undefined,
        userId: 'yo',
        canScore: false,
        isOwnScoreLocked: false,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(r).toEqual({
        hoyosNoGuardados: [2],
        primerMarcado: null,
        segundoMarcado: null,
        porAnotar: [],
        sinAnotar: [2],
      });
    });
  });

  describe('lecturaDelHoyo', () => {
    const vista = {
      matchFormat: 'FOURBALL',
      holes: [
        { holeNumber: 1, par: 4 },
        { holeNumber: 2, par: 3 },
      ],
      players: [
        {
          userId: 'yo',
          userName: 'Yo',
          team: 'A',
          holeCard: [{ holeNumber: 1, par: 5 }],
        },
        {
          userId: 'r1',
          userName: 'Rival Uno',
          team: 'B',
          holeCard: [{ holeNumber: 1, par: 3 }],
        },
        { userId: 'r2', userName: 'Rival Dos', team: 'B' },
        { userId: 'mm', userName: 'Me Marca', team: 'B' },
      ],
      markerAssignments: [
        {
          scorerUserId: 'yo',
          marksUserId: 'r1',
          marksName: 'Rival Uno',
          markedByName: 'Me Marca',
        },
        { scorerUserId: 'yo', marksUserId: 'r2', marksName: 'Rival Dos' },
        { scorerUserId: 'mm', marksUserId: 'yo' },
      ],
    };
    const scoresVisibles = [
      {
        holeNumber: 1,
        holeResult: { standing: '1UP' },
        playerScores: [
          { userId: 'yo', ownScore: 5 },
          { userId: 'r1', markerScore: 3 },
          { userId: 'r2', markerScore: 4 },
        ],
      },
    ];

    it('dado el hoyo 1, cuando se lee, entonces cada uno con su tarjeta, sus filas y sus bloqueos', () => {
      const h = lecturaDelHoyo({
        scoringView: vista,
        currentUserId: 'yo',
        currentHole: 1,
        scoresVisibles,
        primerMarcado: 'r1',
        segundoMarcado: 'r2',
        marcaBloqueadaPara: bloqueadaPara(['r2']),
      });
      expect(h.quienMeMarca).toBe('Me Marca');
      expect(h.markerAssignment).toBe(vista.markerAssignments[0]);
      expect(h.marcaBloqueada).toBe(false);
      expect(h.segundoBloqueado).toBe(true);
      expect(h.aQuienMarco).toBe('Rival Uno');
      expect(h.currentHoleData).toEqual({ holeNumber: 1, par: 5 });
      expect(h.courseHoleData).toEqual({ holeNumber: 1, par: 4 });
      expect(h.holeFor('r1')).toEqual({ holeNumber: 1, par: 3 });
      expect(h.holeFor('r2')).toBeNull();
      expect(h.currentHoleScore).toBe(scoresVisibles[0]);
      expect(h.currentPlayerScore).toEqual({ userId: 'yo', ownScore: 5 });
      expect(h.markedPlayerScore).toEqual({ userId: 'r1', markerScore: 3 });
      expect(h.filaDelSegundo).toEqual({ userId: 'r2', markerScore: 4 });
      expect(h.nombreDelSegundo).toBe('Rival Dos');
    });

    it('dado un hoyo sin tarjeta propia ni filas, cuando se lee, entonces la del campo y sin filas', () => {
      const h = lecturaDelHoyo({
        scoringView: vista,
        currentUserId: 'yo',
        currentHole: 2,
        scoresVisibles,
        primerMarcado: 'r1',
        segundoMarcado: null,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(h.currentHoleData).toEqual({ holeNumber: 2, par: 3 });
      expect(h.currentHoleScore).toBeUndefined();
      expect(h.segundoBloqueado).toBe(true);
      expect(h.nombreDelSegundo).toBeNull();
    });

    it('dado foursomes, cuando se lee, entonces marco a la pareja rival', () => {
      const h = lecturaDelHoyo({
        scoringView: { ...vista, matchFormat: 'FOURSOMES' },
        currentUserId: 'yo',
        currentHole: 1,
        scoresVisibles,
        primerMarcado: 'r1',
        segundoMarcado: null,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(h.aQuienMarco).toBe('Rival Uno / Rival Dos / Me Marca');
    });

    it('dado quien no marca a nadie ni le marcan, cuando se lee, entonces sin nombres y la marca bloqueada', () => {
      const h = lecturaDelHoyo({
        scoringView: {
          players: [],
          markerAssignments: [{ scorerUserId: 'x', marksUserId: 'z' }],
        },
        currentUserId: 'yo',
        currentHole: 1,
        scoresVisibles: [],
        primerMarcado: null,
        segundoMarcado: null,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(h.quienMeMarca).toBeNull();
      expect(h.aQuienMarco).toBeNull();
      expect(h.marcaBloqueada).toBe(true);
      expect(h.currentHoleData).toBeUndefined();
    });

    it('dado que me marca alguien que no está en la lista, cuando se lee, entonces su id', () => {
      const h = lecturaDelHoyo({
        scoringView: {
          players: [],
          markerAssignments: [{ scorerUserId: 'fantasma', marksUserId: 'yo' }],
        },
        currentUserId: 'yo',
        currentHole: 1,
        scoresVisibles: [],
        primerMarcado: null,
        segundoMarcado: null,
        marcaBloqueadaPara: bloqueadaPara([]),
      });
      expect(h.quienMeMarca).toBe('fantasma');
    });
  });
});
