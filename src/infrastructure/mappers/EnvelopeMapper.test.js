import { describe, it, expect } from 'vitest';
import EnvelopeMapper from './EnvelopeMapper';

/**
 * Los sobres, de la API a la pantalla (FE #655).
 *
 * Lo que se pierde aquí no lo ve nadie: la pantalla pinta filas vacías y el
 * capitán no sabe si el rival entregó. Con el draft pasó exactamente eso.
 */
const RESPUESTA = {
  round_id: 'ronda-1',
  revealed: false,
  team_a_submitted: true,
  team_b_submitted: false,
  team_a_automatic: false,
  team_b_automatic: false,
  mine: {
    round_id: 'ronda-1',
    team: 'A',
    entries: [['ana'], ['bea']],
    submitted: true,
    submitted_at: '2030-06-01T10:00:00',
    automatic: false,
  },
  rival: null,
  rival_submitted: false,
  matchups: [],
};

describe('EnvelopeMapper', () => {
  it('E1: trae la vista entera en camelCase', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO(RESPUESTA);

    expect(vista).toEqual({
      roundId: 'ronda-1',
      revealed: false,
      teamASubmitted: true,
      teamBSubmitted: false,
      teamAAutomatic: false,
      teamBAutomatic: false,
      mine: {
        roundId: 'ronda-1',
        team: 'A',
        entries: [['ana'], ['bea']],
        submitted: true,
        submittedAt: '2030-06-01T10:00:00',
        automatic: false,
      },
      rival: null,
      rivalSubmitted: false,
      matchups: [],
    });
  });

  it('E2: los enfrentamientos abiertos llegan con las dos filas', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO({
      ...RESPUESTA,
      revealed: true,
      matchups: [[['ana'], ['carla']], [['bea'], ['dani']]],
    });

    expect(vista.matchups).toEqual([[['ana'], ['carla']], [['bea'], ['dani']]]);
  });

  it('E3: lo que rellenó la aplicación se distingue de lo que entregó un capitán', () => {
    // Si no, la pantalla felicita a un capitán que no entregó nada
    const vista = EnvelopeMapper.toEnvelopesViewDTO({
      ...RESPUESTA,
      team_b_submitted: true,
      team_b_automatic: true,
    });

    expect(vista.teamBSubmitted).toBe(true);
    expect(vista.teamBAutomatic).toBe(true);
  });

  it('E4: sin sobre propio no se inventa uno vacío', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO({ ...RESPUESTA, mine: null });

    expect(vista.mine).toBeNull();
  });

  it('E5: sin listas en la respuesta, listas vacías y no undefined', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO({ round_id: 'r', revealed: false });

    expect(vista.matchups).toEqual([]);
    expect(vista.mine).toBeNull();
  });

  it('E6: y un sobre suelto también se mapea, que es lo que devuelve entregar', () => {
    const sobre = EnvelopeMapper.toEnvelopeDTO(RESPUESTA.mine);

    expect(sobre.entries).toEqual([['ana'], ['bea']]);
    expect(sobre.automatic).toBe(false);
  });
});
