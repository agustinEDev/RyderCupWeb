import { describe, it, expect, vi } from 'vitest';
import {
  golpesDelHoyoDeLaPartida,
  rolesEnLaPartida,
  candadosDeLaCasilla,
  estadoDeEntregaDeLaPartida,
  motivoDelFalloDeCarga,
  textoDelFalloDeLaPartida,
  nombreDe,
  hoyoDeLaTarjetaDe,
} from './lecturaDeLaPartida';

const t = (clave, opciones) =>
  opciones ? `${clave} ${JSON.stringify(opciones)}` : clave;
const tarjeta = (userId, cardStatus, markedByUserId = null) => ({
  userId,
  cardStatus,
  markedByUserId,
});

describe('golpesDelHoyoDeLaPartida: quién puso cada número', () => {
  const players = [
    { userId: 'ana', userName: 'Ana' },
    { userId: 'bea', userName: 'Bea' },
    { userId: 'cris', userName: 'Cris' },
  ];
  const golpes = (mio, suyo) => [
    { holeNumber: 2, playerScores: [] },
    {
      holeNumber: 3,
      playerScores: [
        { userId: 'ana', ...mio },
        { userId: 'bea', ...suyo },
      ],
    },
  ];
  const lee = (mio, suyo, extra = {}) =>
    golpesDelHoyoDeLaPartida({
      t,
      players,
      scoresVisibles: golpes(mio, suyo),
      currentHole: 3,
      userId: 'ana',
      marcoA: 'bea',
      cerradaSinEntregar: false,
      meMarca: 'cris',
      ...extra,
    });

  it.each([
    // lo del marcado                                           | «lo puso otro»
    [{}, null],
    [{ markerSubmitted: true, markerBy: 'ana' }, null],
    [{ markerSubmitted: true, markerBy: null }, null],
    [{ markerSubmitted: false, markerBy: 'cris' }, null],
    [{ markerSubmitted: true, markerBy: 'cris' }, 'Cris'],
    [{ markerSubmitted: true, markerBy: 'cris', markerByName: 'C.' }, 'C.'],
    [{ markerSubmitted: true, markerBy: 'zz' }, 'partida.anotherMarker'],
  ])('el marcado %o: lo puso %s', (suyo, esperado) => {
    expect(lee({}, suyo).loPusoOtro).toBe(esperado);
  });

  it.each([
    // mi golpe                                                   cerrada | me anotó
    [{}, false, 'Cris'],
    [{}, true, null],
    [{ markerSubmitted: true, markerBy: 'bea' }, true, 'Bea'],
    [
      { markerSubmitted: true, markerBy: 'bea', markerByName: 'B.' },
      false,
      'B.',
    ],
    [{ markerSubmitted: true, markerBy: 'zz' }, false, null],
    [{ markerSubmitted: true, markerBy: null }, false, 'Cris'],
  ])('mi golpe %o, cerrada=%s: me anotó %s', (mio, cerrada, esperado) => {
    expect(lee(mio, {}, { cerradaSinEntregar: cerrada }).meAnoto).toBe(
      esperado,
    );
  });

  it('sin quien me marque, nadie me anotó', () => {
    expect(lee({}, {}, { meMarca: undefined }).meAnoto).toBeNull();
  });

  it('los golpes del hoyo en pantalla; sin él, ninguno', () => {
    expect(lee({ ownScore: 4 }, { ownScore: 5 })).toMatchObject({
      miGolpe: { userId: 'ana', ownScore: 4 },
      suGolpe: { userId: 'bea', ownScore: 5 },
    });
    const fuera = lee({}, {}, { currentHole: 9 });
    expect(fuera.miGolpe).toBeUndefined();
    expect(fuera.suGolpe).toBeUndefined();
  });

  it('t solo se pide cuando hace falta', () => {
    const tEspia = vi.fn(t);
    golpesDelHoyoDeLaPartida({
      t: tEspia,
      players,
      scoresVisibles: golpes({}, {}),
      currentHole: 3,
      userId: 'ana',
      marcoA: 'bea',
      cerradaSinEntregar: false,
      meMarca: 'cris',
    });
    expect(tEspia).not.toHaveBeenCalled();
  });
});

describe('rolesEnLaPartida', () => {
  it('junta los roles de las tarjetas y los golpes del hoyo', () => {
    const scoringView = {
      strokePlay: {
        iMarkUserId: 'bea',
        cards: [tarjeta('ana', 'JUGANDO', 'bea'), tarjeta('bea', 'JUGANDO')],
      },
      players: [
        { userId: 'ana', userName: 'Ana' },
        { userId: 'bea', userName: 'Bea' },
      ],
    };
    const roles = rolesEnLaPartida({
      t,
      scoringView,
      scoresVisibles: [],
      currentHole: 1,
      userId: 'ana',
      isMatchPlayer: true,
    });

    expect(roles).toMatchObject({
      marcoA: 'bea',
      meMarca: 'bea',
      meAnoto: 'Bea',
      loPusoOtro: null,
      sigueMarcandome: true,
      sinMarcador: false,
      seJuegaElMarcado: true,
    });
  });
});

describe('candadosDeLaCasilla', () => {
  const base = {
    canScore: true,
    isFullyLocked: false,
    isSessionBlocked: false,
    isOwnScoreLocked: false,
    isMarkerScoreLocked: false,
    cerradaSinEntregar: false,
    marcoA: 'bea',
    seJuegaElMarcado: true,
  };
  it.each([
    [{}, [false, false, false]],
    [{ canScore: false }, [true, true, true]],
    [{ isFullyLocked: true }, [true, false, false]],
    [{ isSessionBlocked: true }, [true, true, true]],
    [{ isOwnScoreLocked: true }, [false, true, false]],
    [{ isMarkerScoreLocked: true }, [false, false, true]],
    [{ cerradaSinEntregar: true }, [true, true, false]],
    [{ marcoA: null }, [false, false, true]],
    [{ seJuegaElMarcado: false }, [false, false, true]],
  ])('%o', (extra, esperado) => {
    const c = candadosDeLaCasilla({ ...base, ...extra });
    expect([c.isReadOnly, c.isOwnScoreLocked, c.isMarkerScoreLocked]).toEqual(
      esperado,
    );
  });
});

describe('estadoDeEntregaDeLaPartida', () => {
  const base = {
    isMatchPlayer: true,
    cerradaSinEntregar: false,
    hasSubmitted: false,
    canSubmitScorecard: false,
    partidoAcabado: false,
  };
  it.each([
    [{}, null],
    [{ partidoAcabado: true }, 'faltaValidar'],
    [{ canSubmitScorecard: true, partidoAcabado: true }, 'entregar'],
    [{ hasSubmitted: true, canSubmitScorecard: true }, 'entregada'],
    [{ hasSubmitted: true, isMatchPlayer: false }, null],
    [{ hasSubmitted: true, cerradaSinEntregar: true }, null],
  ])('%o → %s', (extra, esperado) => {
    expect(estadoDeEntregaDeLaPartida({ ...base, ...extra })).toBe(esperado);
  });
});

describe('nombres y tarjetas', () => {
  const players = [
    {
      userId: 'ana',
      userName: 'Ana',
      holeCard: [{ holeNumber: 1, par: 4, meters: 300 }],
    },
  ];
  it('el nombre, o null', () => {
    expect(nombreDe(players, 'ana')).toBe('Ana');
    expect(nombreDe(players, 'zz')).toBeNull();
  });
  it('el hoyo de la tarjeta, o nada', () => {
    expect(hoyoDeLaTarjetaDe(players, 'ana', 1)).toEqual({
      holeNumber: 1,
      par: 4,
      meters: 300,
    });
    expect(hoyoDeLaTarjetaDe(players, 'ana', 2)).toBeUndefined();
    expect(hoyoDeLaTarjetaDe(players, 'zz', 1)).toBeUndefined();
  });
});

describe('los fallos', () => {
  it.each([
    [{ status: 403 }, 'errors.forbidden'],
    [{ response: { status: 404 } }, 'errors.notFound'],
    [{ status: 500 }, 'offline.noSePudoCargar'],
    [null, 'offline.noSePudoCargar'],
  ])('no se pudo cargar (%o): %s', (err, esperado) => {
    expect(motivoDelFalloDeCarga(t, err)).toBe(esperado);
  });

  it.each([
    [{ status: 404 }, null, 'errors.notFound'],
    [{ status: 404 }, 'concesion', 'errors.notFound'],
    [{ status: 500 }, 'golpe', 'errors.failedToSubmitScore'],
    [{}, 'tarjeta', 'errors.failedToSubmitScorecard'],
    [{ i18nKey: 'a.b' }, 'golpe', 'a.b'],
    [
      { errorCode: 'GROUP_NOT_SCORING', i18nKey: 'a.b' },
      'golpe',
      'partida.errors.GROUP_NOT_SCORING',
    ],
  ])('el recuadro (%o, %s): %s', (err, origen, esperado) => {
    expect(textoDelFalloDeLaPartida(t, err, origen)).toBe(esperado);
  });
});
