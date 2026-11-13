import { describe, expect, it } from 'vitest';

import { estadoDelPartido } from './estadoDelPartido';

const fila = (userId, extra = {}) => ({ userId, ...extra });
const hoyos = (n, deMi) => Array.from({ length: n }, (_, i) => ({ holeNumber: i + 1, playerScores: [fila('yo', deMi)] }));

describe('estadoDelPartido', () => {
  it('dado que no hay vista, cuando se deriva, entonces nadie juega ni puede anotar ni entregar', () => {
    expect(estadoDelPartido(null, 'yo', false)).toEqual({
      isMatchPlayer: false,
      isWithdrawn: false,
      canScore: false,
      hasSubmitted: false,
      isOwnScoreLocked: false,
      isMarkerScoreLocked: false,
      isFullyLocked: false,
      validatedHoles: 0,
      totalHoles: 18,
      canSubmitScorecard: false,
      partidoAcabado: false,
      holesToSubmit: 18,
    });
  });

  it('dado un administrador que no juega, cuando se deriva, entonces puede anotar', () => {
    const e = estadoDelPartido({ players: [fila('otro')] }, 'yo', true);
    expect(e.isMatchPlayer).toBe(false);
    expect(e.canScore).toBe(true);
  });

  it('dado un jugador retirado, cuando se deriva, entonces ya no anota', () => {
    const e = estadoDelPartido({ players: [fila('yo')], withdrawnPlayerIds: ['yo'] }, 'yo', false);
    expect(e.isMatchPlayer).toBe(true);
    expect(e.isWithdrawn).toBe(true);
    expect(e.canScore).toBe(false);
  });

  it('dada mi tarjeta entregada y la de quien marco, cuando se deriva, entonces todo queda bloqueado', () => {
    const vista = {
      players: [fila('yo'), fila('rival')],
      scorecardSubmittedBy: ['yo', 'rival'],
      markerAssignments: [{ scorerUserId: 'yo', marksUserId: 'rival' }, { scorerUserId: 'otro', marksUserId: 'yo' }],
    };
    const e = estadoDelPartido(vista, 'yo', false);
    expect(e.hasSubmitted).toBe(true);
    expect(e.isOwnScoreLocked).toBe(true);
    expect(e.isMarkerScoreLocked).toBe(true);
    expect(e.isFullyLocked).toBe(true);
  });

  it('dado que entrega quien me marca y no quien marco, cuando se deriva, entonces la marca sigue abierta', () => {
    const vista = {
      players: [fila('yo')],
      scorecardSubmittedBy: ['otro'],
      markerAssignments: [{ scorerUserId: 'yo', marksUserId: 'rival' }, { scorerUserId: 'otro', marksUserId: 'yo' }],
    };
    const e = estadoDelPartido(vista, 'yo', false);
    expect(e.isMarkerScoreLocked).toBe(false);
    expect(e.isFullyLocked).toBe(false);
  });

  it('dada solo mi tarjeta entregada, cuando se deriva, entonces la marca sigue abierta y no está todo bloqueado', () => {
    const vista = {
      players: [fila('yo')],
      scorecardSubmittedBy: ['yo'],
      markerAssignments: [{ scorerUserId: 'yo', marksUserId: 'rival' }, { scorerUserId: 'otro', marksUserId: 'yo' }],
    };
    const e = estadoDelPartido(vista, 'yo', false);
    expect(e.isOwnScoreLocked).toBe(true);
    expect(e.isMarkerScoreLocked).toBe(false);
    expect(e.isFullyLocked).toBe(false);
  });

  it('dados los 18 validados, cuando se deriva, entonces se puede entregar y está acabado', () => {
    const e = estadoDelPartido(
      { players: [fila('yo')], scores: hoyos(18, { ownSubmitted: true, validationStatus: 'match' }) },
      'yo',
      false
    );
    expect(e.validatedHoles).toBe(18);
    expect(e.canSubmitScorecard).toBe(true);
    expect(e.partidoAcabado).toBe(true);
    expect(e.holesToSubmit).toBe(18);
  });

  it('dados 17 validados sin decidir, cuando se deriva, entonces no se puede entregar', () => {
    const e = estadoDelPartido(
      { players: [fila('yo')], scores: hoyos(17, { ownSubmitted: true, validationStatus: 'match' }) },
      'yo',
      false
    );
    expect(e.canSubmitScorecard).toBe(false);
    expect(e.partidoAcabado).toBe(false);
  });

  it('dado un partido decidido con lo jugado validado, cuando se deriva, entonces se entrega lo jugado', () => {
    const e = estadoDelPartido(
      { players: [fila('yo')], isDecided: true, scores: hoyos(12, { markerSubmitted: true, validationStatus: 'match' }) },
      'yo',
      false
    );
    expect(e.canSubmitScorecard).toBe(true);
    expect(e.partidoAcabado).toBe(true);
    expect(e.holesToSubmit).toBe(12);
  });

  it('dado un partido decidido con un hoyo jugado sin validar, cuando se deriva, entonces no se entrega', () => {
    const scores = hoyos(3, { ownSubmitted: true, validationStatus: 'match' });
    scores[1].playerScores[0] = fila('yo', { markerSubmitted: true, validationStatus: 'pending' });
    const e = estadoDelPartido({ players: [fila('yo')], isDecided: true, scores }, 'yo', false);
    expect(e.canSubmitScorecard).toBe(false);
  });

  it('dado un partido decidido sin nada jugado, cuando se deriva, entonces no se entrega', () => {
    const e = estadoDelPartido({ players: [fila('yo')], isDecided: true, scores: [] }, 'yo', false);
    expect(e.canSubmitScorecard).toBe(false);
    expect(e.holesToSubmit).toBe(0);
  });

  it('dada mi tarjeta ya entregada, cuando se deriva, entonces no se vuelve a entregar', () => {
    const e = estadoDelPartido(
      { players: [fila('yo')], scorecardSubmittedBy: ['yo'], scores: hoyos(18, { ownSubmitted: true, validationStatus: 'match' }) },
      'yo',
      false
    );
    expect(e.canSubmitScorecard).toBe(false);
  });
});
