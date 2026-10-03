import { describe, it, expect } from 'vitest';
import { RyderCupSetup } from './RyderCupSetup';
import { TeamAssignment } from './TeamAssignment';

/**
 * Lo que solo tiene una Ryder Cup, en su pieza (FE #791), como en el backend
 * (RyderCupAm#471): una competición la tiene o no la tiene.
 */
const pieza = (extra = {}) =>
  new RyderCupSetup({
    team1Name: 'Europa',
    team2Name: 'USA',
    teamAssignment: TeamAssignment.MANUAL,
    ...extra,
  });

describe('RyderCupSetup (FE #791)', () => {
  it('R1: guarda los equipos y el reparto', () => {
    const ryder = pieza();

    expect([ryder.team1Name, ryder.team2Name]).toEqual(['Europa', 'USA']);
    expect(ryder.teamAssignment.value()).toBe('MANUAL');
  });

  it.each([
    [{ team1Name: '' }, 'Team 1 name cannot be empty.'],
    [{ team2Name: '  ' }, 'Team 2 name cannot be empty.'],
    [{ team2Name: 'europa' }, 'Team names must be different.'],
  ])('R2: valida los nombres (%o)', (extra, error) => {
    expect(() => pieza(extra)).toThrow(error);
  });

  it('R3: es inmutable: cambiar devuelve otra pieza', () => {
    const ryder = pieza();

    const otra = ryder.with({ team1Name: 'Asia' });

    expect(otra.team1Name).toBe('Asia');
    expect(ryder.team1Name).toBe('Europa');
    expect(Object.isFrozen(ryder)).toBe(true);
  });

  it('R4: cambiar también valida', () => {
    expect(() => pieza().with({ team1Name: 'USA' })).toThrow('Team names must be different.');
  });
});
