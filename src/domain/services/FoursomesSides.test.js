import { describe, it, expect } from 'vitest';

import {
  entryAtOf,
  groupParticipantsBySide,
  sideCardHolder,
  sideEntryOf,
  sideScoreOf,
} from './FoursomesSides';

const participants = [
  { participantId: 'a1', name: 'Yo', team: 'A' },
  { participantId: 'a2', name: 'Socio', team: 'A' },
  { participantId: 'b1', name: 'Rival Uno', team: 'B' },
  { participantId: 'b2', name: 'Rival Dos', team: 'B' },
];

describe('groupParticipantsBySide', () => {
  it('agrupa por bando respetando el orden de llegada', () => {
    expect(groupParticipantsBySide(participants).map((s) => s.map((p) => p.participantId))).toEqual([
      ['a1', 'a2'],
      ['b1', 'b2'],
    ]);
  });

  it('deja solo a cada jugador cuando no hay bando', () => {
    const sinBando = participants.map((p) => ({ ...p, team: null }));

    // Agruparlos a todos bajo el mismo bando convertía la partida en un bando
    // de cuatro: una tarjeta única y un total que suma a los rivales.
    expect(groupParticipantsBySide(sinBando).map((s) => s.map((p) => p.participantId))).toEqual([
      ['a1'],
      ['a2'],
      ['b1'],
      ['b2'],
    ]);
  });

  it('trata un bando vacío como falta de bando', () => {
    // El mapper deja pasar un `team` vacío tal cual; con `??` los cuatro caían
    // en el mismo grupo y salía un bando de cuatro con el rival dentro.
    const vacio = participants.map((p) => ({ ...p, team: '' }));

    expect(groupParticipantsBySide(vacio).map((s) => s.length)).toEqual([1, 1, 1, 1]);
  });

  it('no mezcla a los que sí tienen bando con los que no', () => {
    const mixtos = [participants[0], { ...participants[1], team: null }, participants[2]];

    expect(groupParticipantsBySide(mixtos).map((s) => s.map((p) => p.participantId))).toEqual([
      ['a1'],
      ['a2'],
      ['b1'],
    ]);
  });

  it('devuelve una lista vacía sin participantes', () => {
    expect(groupParticipantsBySide()).toEqual([]);
  });
});

describe('sideScoreOf', () => {
  const side = [participants[0], participants[1]];

  it('toma la del primer miembro del bando que la tenga', () => {
    // La bola se guarda a nombre del primero, así que en la práctica es la suya.
    expect(sideScoreOf(side, (id) => (id === 'a1' ? 4 : 6))).toBe(4);
  });

  it('sigue al compañero cuando el primero no tiene nota', () => {
    expect(sideScoreOf(side, (id) => (id === 'a2' ? 5 : null))).toBe(5);
  });

  it('elige siempre la misma con dos anotaciones distintas del mismo hoyo', () => {
    // El desacuerdo se aclara entre las parejas, pero mientras dure las tres
    // pantallas tienen que enseñar el mismo número: recorrer el bando —y no los
    // golpes en el orden que lleguen— es lo que lo garantiza.
    const holeScores = [
      { participantId: 'a2', holeNumber: 1, score: 6 },
      { participantId: 'a1', holeNumber: 1, score: 4 },
    ];
    const scoreAt = (id) => holeScores.find((hs) => hs.participantId === id)?.score ?? null;

    expect(sideScoreOf(side, scoreAt)).toBe(4);
  });

  it('devuelve null si el bando no ha anotado el hoyo', () => {
    expect(sideScoreOf(side, () => null)).toBeNull();
  });

  it('no confunde un 0 con la falta de nota', () => {
    expect(sideScoreOf(side, (id) => (id === 'a1' ? 0 : 5))).toBe(0);
  });
});

describe('sideCardHolder', () => {
  it('es el primer jugador del bando', () => {
    expect(sideCardHolder([participants[0], participants[1]]).participantId).toBe('a1');
  });

  it('no revienta con un bando vacío', () => {
    expect(sideCardHolder([])).toBeUndefined();
  });
});

describe('entryAtOf y sideEntryOf', () => {
  const side = [participants[0], participants[1]];

  it('distingue el hoyo recogido del hoyo sin anotar', () => {
    // Los dos dan `score` nulo y significan lo contrario: recogido es un hoyo
    // jugado y cerrado, sin anotar es uno que falta.
    const holeScores = [{ participantId: 'a1', holeNumber: 1, score: null }];
    const entryAt = entryAtOf(holeScores);

    expect(entryAt(1)('a1')).toEqual({ participantId: 'a1', holeNumber: 1, score: null });
    expect(entryAt(2)('a1')).toBeNull();
  });

  it('toma la raya del bando cuando es la unica anotacion', () => {
    const holeScores = [{ participantId: 'a1', holeNumber: 1, score: null }];
    const entryAt = entryAtOf(holeScores);

    expect(sideEntryOf(side, entryAt(1))).not.toBeNull();
    expect(sideEntryOf(side, entryAt(1)).score).toBeNull();
  });

  it('deja mandar al numero sobre la raya del titular', () => {
    // Una bola, dos anotaciones: es con el NUMERO con el que `_best_ball`
    // adjudica el hoyo, asi que pintar la raya dejaria una tarjeta que no
    // explica el resultado del partido. Entre dos numeros sigue mandando el
    // del primero del bando, que es lo que iguala todas las pantallas.
    const holeScores = [
      { participantId: 'a1', holeNumber: 1, score: null },
      { participantId: 'a2', holeNumber: 1, score: 6 },
    ];
    const entryAt = entryAtOf(holeScores);

    expect(sideEntryOf(side, entryAt(1)).score).toBe(6);
  });

  it('devuelve null si el bando no ha anotado el hoyo', () => {
    expect(sideEntryOf(side, () => null)).toBeNull();
  });
});
