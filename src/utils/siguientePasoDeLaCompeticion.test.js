import { describe, it, expect } from 'vitest';
import { siguientePasoDeLaCompeticion } from './siguientePasoDeLaCompeticion';

/**
 * Qué toca ahora en una competición (FE #705).
 *
 * La ficha ofrecía hasta siete botones del mismo peso en seis colores, y el
 * que de verdad tocaba se perdía entre los demás. Aquí vive la regla de cuál
 * es ese, para que la pantalla ofrezca UNO y el resto viva en un menú.
 */

const competicion = (extra = {}) => ({
  status: 'ACTIVE',
  setupMode: 'RYDER_CUP',
  teamsAssigned: false,
  ...extra,
});

describe('siguientePasoDeLaCompeticion', () => {
  it('S1: recién creada, activarla', () => {
    expect(siguientePasoDeLaCompeticion(competicion({ status: 'DRAFT' }))).toBe('activate');
  });

  it('S2: abierta y sin capitanes, nombrarlos', () => {
    expect(siguientePasoDeLaCompeticion(competicion())).toBe('nameCaptains');
  });

  it('S3: reabierta con los equipos ya hechos, volver a cerrar', () => {
    // Reabrir no deshace el reparto y los capitanes ya no se tocan
    expect(siguientePasoDeLaCompeticion(competicion({ teamsAssigned: true }))).toBe(
      'close-enrollments'
    );
  });

  it('S4: cerrada en modo Ryder y sin equipos, la sala de draft', () => {
    expect(
      siguientePasoDeLaCompeticion(
        competicion({ status: 'CLOSED', captains: { teamA: 'ana', teamB: 'bea' } })
      )
    ).toBe('draft');
  });

  it('S4b: pero sin capitanes, lo que toca es nombrarlos', () => {
    // La sala no tiene quién elija, así que la acción del draft no se ofrece:
    // sin esto la ficha se quedaba SIN botón principal y «Nombrar capitanes»
    // enterrado en el menú, justo cuando es lo único que hay que hacer
    expect(siguientePasoDeLaCompeticion(competicion({ status: 'CLOSED' }))).toBe('nameCaptains');
  });

  it('S4c: con un solo capitán tampoco: faltan los dos', () => {
    expect(
      siguientePasoDeLaCompeticion(
        competicion({ status: 'CLOSED', captains: { teamA: 'ana', teamB: null } })
      )
    ).toBe('nameCaptains');
  });

  it('S5: en los otros modos no hay sala, se reparten en el calendario', () => {
    expect(
      siguientePasoDeLaCompeticion(competicion({ status: 'CLOSED', setupMode: 'MANUAL' }))
    ).toBe('manageSchedule');
  });

  it('S6: cerrada y con equipos, montar el calendario', () => {
    expect(
      siguientePasoDeLaCompeticion(competicion({ status: 'CLOSED', teamsAssigned: true }))
    ).toBe('manageSchedule');
  });

  it('S7: en juego, la clasificación', () => {
    expect(siguientePasoDeLaCompeticion(competicion({ status: 'IN_PROGRESS' }))).toBe(
      'leaderboard'
    );
  });

  it('S8: terminada, también la clasificación', () => {
    expect(siguientePasoDeLaCompeticion(competicion({ status: 'COMPLETED' }))).toBe('leaderboard');
  });

  it('S9: cancelada no tiene siguiente paso', () => {
    expect(siguientePasoDeLaCompeticion(competicion({ status: 'CANCELLED' }))).toBeNull();
  });

  it('S10: quien no organiza no tiene pasos de organizador', () => {
    // Un jugador ve la ficha, pero no le toca nada de esto
    expect(siguientePasoDeLaCompeticion(competicion(), { puedeGestionar: false })).toBeNull();
  });

  it('S11: pero en juego sí ve la clasificación', () => {
    expect(
      siguientePasoDeLaCompeticion(competicion({ status: 'IN_PROGRESS' }), {
        puedeGestionar: false,
      })
    ).toBe('leaderboard');
  });

  it('S12: sin competición todavía, nada', () => {
    expect(siguientePasoDeLaCompeticion(null)).toBeNull();
  });
});
