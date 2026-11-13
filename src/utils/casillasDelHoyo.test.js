import { describe, expect, it } from 'vitest';

import { casillasDelHoyo } from './casillasDelHoyo';

const holes = [{ holeNumber: 1, par: 4, strokeIndex: 5 }, { holeNumber: 2, par: 3, strokeIndex: 9 }];
const tees = [{ color: 'ROJO', gender: 'F', holes: [{ holeNumber: 1, par: 5, strokeIndex: 1 }] }];
const ana = { participantId: 'p1', name: 'Ana', color: 'ROJO', teeGender: 'F', team: 'A' };
const luis = { participantId: 'p2', name: 'Luis', color: 'BLANCO', team: 'A' };
const eva = { participantId: 'p3', name: 'Eva', color: 'BLANCO', team: 'B' };
const leo = { participantId: 'p4', name: 'Leo', color: 'BLANCO', team: 'B' };

describe('casillasDelHoyo', () => {
  it('dado individual, cuando se pinta el hoyo, entonces una casilla por cubierto con la tarjeta de su barra', () => {
    const { currentHoleData, entries } = casillasDelHoyo({
      quickMatch: { participants: [ana, luis] },
      holes, tees, currentHole: 1, myParticipant: ana,
      coveredParticipantIds: ['p1', 'p2', 'p9'],
      holeScoresVisibles: [
        { holeNumber: 1, participantId: 'p1', score: 6 },
        { holeNumber: 1, participantId: 'p2', score: null },
        { holeNumber: 2, participantId: 'p1', score: 3 },
      ],
    });
    expect(currentHoleData).toEqual({ holeNumber: 1, par: 5, strokeIndex: 1 });
    expect(entries).toEqual([
      { participantId: 'p1', scoreIds: ['p1'], name: 'Ana', score: 6, isPickedUp: false, hole: { holeNumber: 1, par: 5, strokeIndex: 1 } },
      { participantId: 'p2', scoreIds: ['p2'], name: 'Luis', score: null, isPickedUp: true, hole: holes[0] },
      { participantId: 'p9', scoreIds: ['p9'], name: '', score: null, isPickedUp: false, hole: holes[0] },
    ]);
  });

  it('dado un hoyo que la barra no trae, cuando se pinta, entonces la reserva del campo', () => {
    const { currentHoleData } = casillasDelHoyo({
      quickMatch: { participants: [ana] }, holes, tees, currentHole: 2, myParticipant: ana,
      coveredParticipantIds: [], holeScoresVisibles: [],
    });
    expect(currentHoleData).toEqual(holes[1]);
  });

  it('dado un hoyo que nadie trae, cuando se pinta, entonces no hay hoyo', () => {
    const { currentHoleData, entries } = casillasDelHoyo({
      quickMatch: null, holes, tees, currentHole: 7, myParticipant: null,
      coveredParticipantIds: [], holeScoresVisibles: [],
    });
    expect(currentHoleData).toBeNull();
    expect(entries).toEqual([]);
  });

  it('dado foursomes, cuando se pinta, entonces una casilla por bando a nombre del titular y con mi nombre delante', () => {
    const { entries } = casillasDelHoyo({
      quickMatch: { matchFormat: 'FOURSOMES', participants: [ana, luis, eva, leo] },
      holes, tees, currentHole: 1, myParticipant: luis,
      coveredParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      holeScoresVisibles: [{ holeNumber: 1, participantId: 'p2', score: 5 }],
    });
    expect(entries).toEqual([
      { participantId: 'p1', scoreIds: ['p1', 'p2'], name: 'Luis & Ana', score: 5, isPickedUp: false, hole: { holeNumber: 1, par: 5, strokeIndex: 1 }, side: 'p1' },
      { participantId: 'p3', scoreIds: ['p3', 'p4'], name: 'Eva & Leo', score: null, isPickedUp: false, hole: holes[0], side: 'p3' },
    ]);
  });

  it('dado foursomes sin cubrir al titular, cuando se pinta, entonces se escribe y se lee bajo el cubierto', () => {
    const { entries } = casillasDelHoyo({
      quickMatch: { matchFormat: 'FOURSOMES', participants: [ana, luis, eva, leo] },
      holes, tees, currentHole: 1, myParticipant: luis,
      coveredParticipantIds: ['p2'],
      holeScoresVisibles: [
        { holeNumber: 1, participantId: 'p1', score: 4 },
        { holeNumber: 1, participantId: 'p2', score: null },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].participantId).toBe('p2');
    expect(entries[0].side).toBe('p1');
    expect(entries[0].score).toBe(4);
  });

  it('dado foursomes leyendo bajo el cubierto con número en los dos, cuando se pinta, entonces manda el del cubierto', () => {
    const { entries } = casillasDelHoyo({
      quickMatch: { matchFormat: 'FOURSOMES', participants: [ana, luis] },
      holes, tees, currentHole: 1, myParticipant: luis,
      coveredParticipantIds: ['p2'],
      holeScoresVisibles: [
        { holeNumber: 1, participantId: 'p1', score: 4 },
        { holeNumber: 1, participantId: 'p2', score: 6 },
      ],
    });
    expect(entries[0].score).toBe(6);
  });

  it('dado foursomes leyendo bajo el cubierto con una raya suya, cuando se pinta, entonces la raya va primero', () => {
    const { entries } = casillasDelHoyo({
      quickMatch: { matchFormat: 'FOURSOMES', participants: [ana, luis] },
      holes, tees, currentHole: 1, myParticipant: null,
      coveredParticipantIds: ['p2'],
      holeScoresVisibles: [{ holeNumber: 1, participantId: 'p2', score: null }],
    });
    expect(entries[0].isPickedUp).toBe(true);
    expect(entries[0].name).toBe('Ana & Luis');
  });

  it('dado foursomes sin partida, cuando se pinta, entonces no hay casillas', () => {
    const { entries } = casillasDelHoyo({
      quickMatch: { matchFormat: 'FOURSOMES' }, holes, tees, currentHole: 1, myParticipant: null,
      coveredParticipantIds: [], holeScoresVisibles: [],
    });
    expect(entries).toEqual([]);
  });
});
