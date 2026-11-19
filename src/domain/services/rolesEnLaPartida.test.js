import { describe, it, expect } from 'vitest';
import {
  rolesDeLasTarjetas,
  golpesDelSelectorDeLaPartida,
  anotacionTerminada,
} from './rolesEnLaPartida';

const tarjeta = (userId, cardStatus, markedByUserId = null) => ({
  userId,
  cardStatus,
  markedByUserId,
});

/**
 * Mis roles según las tarjetas. Ana es «yo»; Bea, a quien marco; Cris, quien
 * me marca. Columnas esperadas: cerrada sin entregar, no presentado, sigue
 * marcándome, sin marcador, se juega el marcado.
 */
describe('rolesDeLasTarjetas', () => {
  it.each([
    // mi estado,       me marca, su estado,      marco a, su estado,   juego, | cerrada, noPres, sigue, sinMarc, seJuegaElMarcado
    [
      'JUGANDO',
      'cris',
      'JUGANDO',
      'bea',
      'JUGANDO',
      true,
      [false, false, true, false, true],
    ],
    [
      'JUGANDO',
      'cris',
      'RETIRADO',
      'bea',
      'JUGANDO',
      true,
      [false, false, false, true, true],
    ],
    [
      'JUGANDO',
      'cris',
      'NO_PRESENTADO',
      'bea',
      'JUGANDO',
      true,
      [false, false, false, true, true],
    ],
    [
      'JUGANDO',
      'cris',
      'ENTREGADA',
      'bea',
      'JUGANDO',
      true,
      [false, false, true, true, true],
    ],
    [
      'JUGANDO',
      null,
      null,
      null,
      null,
      true,
      [false, false, false, true, false],
    ],
    [
      'JUGANDO',
      'cris',
      'JUGANDO',
      'bea',
      'RETIRADO',
      true,
      [false, false, true, false, false],
    ],
    [
      'JUGANDO',
      'cris',
      'JUGANDO',
      'bea',
      'ENTREGADA',
      true,
      [false, false, true, false, false],
    ],
    [
      'ENTREGADA',
      'cris',
      'JUGANDO',
      'bea',
      'JUGANDO',
      true,
      [false, false, true, false, true],
    ],
    [
      'RETIRADO',
      'cris',
      'JUGANDO',
      'bea',
      'JUGANDO',
      true,
      [true, false, true, false, true],
    ],
    [
      'NO_PRESENTADO',
      'cris',
      'JUGANDO',
      'bea',
      'JUGANDO',
      true,
      [true, true, true, false, true],
    ],
    // Quien no juega (organizador que mira): sin tarjeta, nunca «sin marcador»
    [null, null, null, null, null, false, [false, false, false, false, false]],
    [
      'JUGANDO',
      'cris',
      'RETIRADO',
      'bea',
      'JUGANDO',
      false,
      [false, false, false, false, true],
    ],
  ])(
    'yo %s, me marca %s (%s), marco a %s (%s), juego=%s',
    (
      miEstado,
      meMarca,
      suEstado,
      marcoA,
      estadoDelMarcado,
      juego,
      esperado,
    ) => {
      const tarjetas = [
        miEstado && tarjeta('ana', miEstado, meMarca),
        meMarca && tarjeta(meMarca, suEstado),
        marcoA && tarjeta(marcoA, estadoDelMarcado),
      ].filter(Boolean);

      const roles = rolesDeLasTarjetas({
        tarjetas,
        iMarkUserId: marcoA,
        userId: 'ana',
        isMatchPlayer: juego,
      });

      expect([
        roles.cerradaSinEntregar,
        roles.noPresentado,
        roles.sigueMarcandome,
        Boolean(roles.sinMarcador),
        roles.seJuegaElMarcado,
      ]).toEqual(esperado);
      expect(roles.marcoA).toBe(marcoA);
      expect(roles.meMarca).toBe(miEstado ? meMarca : undefined);
      expect(roles.miTarjeta?.userId).toBe(miEstado ? 'ana' : undefined);
    },
  );

  it('sin marcador es `false` (no otro falso) para quien no juega', () => {
    expect(
      rolesDeLasTarjetas({
        tarjetas: [],
        iMarkUserId: null,
        userId: 'ana',
        isMatchPlayer: false,
      }).sinMarcador,
    ).toBe(false);
  });
});

describe('el selector y la anotación terminada', () => {
  const scoresVisibles = [
    {
      holeNumber: 1,
      playerScores: [{ userId: 'ana' }, { userId: 'bea' }, { userId: 'cris' }],
    },
  ];
  it.each([
    ['JUGANDO', true, ['ana', 'bea']],
    ['RETIRADO', true, ['ana']],
    ['NO_PRESENTADO', true, ['ana']],
    ['ENTREGADA', true, ['ana', 'bea']],
    // Quien mira sin jugar ve a los que siguen
    ['RETIRADO', false, ['bea']],
  ])(
    'yo %s (juego=%s): el selector cuenta a %o',
    (miEstado, juego, esperado) => {
      const golpes = golpesDelSelectorDeLaPartida({
        tarjetas: [
          tarjeta('ana', miEstado),
          tarjeta('bea', 'JUGANDO'),
          tarjeta('cris', 'RETIRADO'),
        ],
        scoresVisibles,
        userId: 'ana',
        isMatchPlayer: juego,
      });
      expect(golpes[0].playerScores.map((p) => p.userId)).toEqual(esperado);
      expect(golpes[0].holeNumber).toBe(1);
    },
  );

  it.each([
    [undefined, false],
    [{ matchStatus: 'COMPLETED' }, true],
    [{ strokePlay: { cards: [tarjeta('ana', 'JUGANDO')] } }, false],
    [{ strokePlay: { cards: [tarjeta('ana', 'ENTREGADA')] } }, true],
    [{ strokePlay: { cards: [tarjeta('bea', 'RETIRADO')] } }, false],
  ])('anotación terminada con %o: %s', (vista, esperado) => {
    expect(anotacionTerminada(vista, 'ana')).toBe(esperado);
  });
});
