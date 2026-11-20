import { describe, it, expect } from 'vitest';
import { peticionDelBorrador } from './peticionDelBorrador';

/**
 * Lo que manda el asistente de partida rápida al confirmar:
 *
 *   #   caso                                          | qué viaja
 *   ----|---------------------------------------------|----------------------------------
 *   P1  match play, hándicaps sin tocar               | formato sí, puntuación no; sin overrides
 *   P2  quien crea y un amigo cambiaron su hándicap   | los dos, como override
 *   P3  juego libre                                   | puntuación sí, formato no
 *   P4  invitado                                      | GUEST con nombre, hándicap y barra
 *   P5  nombre en blanco                              | el sugerido; sin sugerido, null
 *   P6  sin campo                                     | lanza (el envío lo trata como fallo)
 */
const yo = {
  participantId: 'u1',
  userId: 'u1',
  handicap: 10,
  profileHandicap: 10,
  team: 'A',
  isGuest: false,
  color: 'yellow',
  teeGender: 'MALE',
};
const amigo = {
  participantId: 'u2',
  userId: 'u2',
  handicap: 20,
  profileHandicap: 20,
  team: 'B',
  isGuest: false,
  color: 'red',
  teeGender: 'FEMALE',
};
const invitado = {
  participantId: 'invitado-1',
  userId: null,
  firstName: 'Ana',
  lastName: 'Gil',
  handicap: 15,
  team: null,
  isGuest: true,
  color: 'white',
  teeGender: null,
};

const base = {
  participants: [yo, amigo],
  currentUserId: 'u1',
  creatorTeeKey: 'yellow|MALE',
  selectedCourse: { id: 'gc-1' },
  isFreePlay: false,
  matchFormat: 'SINGLES',
  scoringFormat: 'STABLEFORD',
  matchName: 'Mi partida',
  nombreSugerido: 'Campo · 20/11',
  allowancePercentage: 100,
  playMode: 'HANDICAP',
  scorerIds: ['u1'],
};

describe('peticionDelBorrador', () => {
  it('P1: match play con los hándicaps sin tocar', () => {
    expect(peticionDelBorrador(base)).toEqual({
      golfCourseId: 'gc-1',
      matchFormat: 'SINGLES',
      scoringFormat: null,
      name: 'Mi partida',
      allowancePercentage: 100,
      playMode: 'HANDICAP',
      creatorTeeColor: 'yellow',
      creatorTeeGender: 'MALE',
      creatorHandicap: null,
      participants: [
        {
          kind: 'FRIEND',
          friendUserId: 'u2',
          handicap: null,
          team: 'B',
          teeColor: 'red',
          teeGender: 'FEMALE',
        },
      ],
      scorerUserIds: ['u1'],
    });
  });

  it('P2: un hándicap cambiado viaja como override', () => {
    const peticion = peticionDelBorrador({
      ...base,
      participants: [
        { ...yo, handicap: 8 },
        { ...amigo, handicap: 18.5 },
      ],
    });
    expect(peticion.creatorHandicap).toBe(8);
    expect(peticion.participants[0].handicap).toBe(18.5);
  });

  it('P3: en juego libre viaja la puntuación y no el formato', () => {
    const peticion = peticionDelBorrador({ ...base, isFreePlay: true });
    expect(peticion.matchFormat).toBeNull();
    expect(peticion.scoringFormat).toBe('STABLEFORD');
  });

  it('P4: un invitado va como GUEST con su hándicap tal cual', () => {
    const peticion = peticionDelBorrador({
      ...base,
      participants: [yo, invitado],
    });
    expect(peticion.participants).toEqual([
      {
        kind: 'GUEST',
        firstName: 'Ana',
        lastName: 'Gil',
        handicap: 15,
        team: null,
        teeColor: 'white',
        teeGender: null,
      },
    ]);
  });

  it('P5: un nombre en blanco viaja como el sugerido, y sin él como null', () => {
    expect(peticionDelBorrador({ ...base, matchName: '   ' }).name).toBe(
      'Campo · 20/11',
    );
    expect(
      peticionDelBorrador({ ...base, matchName: '', nombreSugerido: '' }).name,
    ).toBeNull();
  });

  it('P6: sin campo lanza', () => {
    expect(() =>
      peticionDelBorrador({ ...base, selectedCourse: null }),
    ).toThrow();
  });

  it('sin barra elegida, quien crea va sin color ni género', () => {
    const peticion = peticionDelBorrador({ ...base, creatorTeeKey: '' });
    expect(peticion.creatorTeeColor).toBeNull();
    expect(peticion.creatorTeeGender).toBeNull();
  });
});
