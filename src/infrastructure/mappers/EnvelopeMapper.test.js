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
    reveal_when_both_ready: true,
  },
  rival: null,
  rival_submitted: false,
  rival_wants_early: false,
  reveal_scheduled_at: '2026-06-01T00:00:00+02:00',
  can_reveal: false,
  matchups: [],
  my_players: [
    { user_id: 'ana', name: 'Ana Alba', handicap: '8.0' },
    { user_id: 'bea', name: 'Bea Blanco', handicap: '14.0' },
  ],
  player_names: { ana: 'Ana Alba', bea: 'Bea Blanco' },
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
        revealWhenBothReady: true,
      },
      rival: null,
      rivalSubmitted: false,
      rivalWantsEarly: false,
      revealScheduledAt: '2026-06-01T00:00:00+02:00',
      canReveal: false,
      playersPerRow: 1,
      teamsFitFormat: true,
      matchups: [],
      myPlayers: [
        { userId: 'ana', name: 'Ana Alba', handicap: 8 },
        { userId: 'bea', name: 'Bea Blanco', handicap: 14 },
      ],
      playerNames: { ana: 'Ana Alba', bea: 'Bea Blanco' },
    });
  });

  it('E1b: los nombres y los jugadores propios son TODO lo que la pantalla tiene', () => {
    // El servidor los manda para esto: sin ellos, el capitán no ve su lista
    // —y acaba en la pantalla de «esto lo entregan los capitanes»— y los
    // enfrentamientos salen como UUID. Los tests de pantalla no lo ven: usan
    // un doble del caso de uso que ya trae los nombres puestos
    const vista = EnvelopeMapper.toEnvelopesViewDTO(RESPUESTA);

    expect(vista.myPlayers.map((j) => j.userId)).toEqual(['ana', 'bea']);
    expect(vista.playerNames.ana).toBe('Ana Alba');
  });

  it('E1c: y quien puede abrirlos lo decide el servidor, no la pantalla', () => {
    // La regla —el organizador siempre, un capitán solo con los dos dentro—
    // vive en un sitio: repetirla aquí es donde se desincronizan
    const vista = EnvelopeMapper.toEnvelopesViewDTO({ ...RESPUESTA, can_reveal: true });

    expect(vista.canReveal).toBe(true);
  });

  it('E1d: y lo que cada capitán pidió sobre adelantar la apertura', () => {
    // Con que lo marquen los dos, los sobres se abren sin esperar a la hora:
    // la pantalla necesita saber quién lo ha pedido para poder decirlo
    const vista = EnvelopeMapper.toEnvelopesViewDTO({
      ...RESPUESTA,
      rival_wants_early: true,
    });

    expect(vista.mine.revealWhenBothReady).toBe(true);
    expect(vista.rivalWantsEarly).toBe(true);
  });

  it('E1e: y la hora a la que se abren solos, que es el plazo para entregar', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO(RESPUESTA);

    expect(vista.revealScheduledAt).toBe('2026-06-01T00:00:00+02:00');
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
    expect(vista.myPlayers).toEqual([]);
    expect(vista.playerNames).toEqual({});
  });

  it('E6: y un sobre suelto también se mapea, que es lo que devuelve entregar', () => {
    const sobre = EnvelopeMapper.toEnvelopeDTO(RESPUESTA.mine);

    expect(sobre.entries).toEqual([['ana'], ['bea']]);
    expect(sobre.automatic).toBe(false);
  });

  it('trae cuántos jugadores van por fila, que es lo que la pantalla necesita', () => {
    // Que el front sepa «FOURBALL es de parejas» sería duplicar una regla que
    // ya vive en el agregado del backend
    const vista = EnvelopeMapper.toEnvelopesViewDTO({
      round_id: 'r1',
      revealed: false,
      players_per_row: 2,
    });

    expect(vista.playersPerRow).toBe(2);
  });

  it('y sin ese dato asume uno por fila', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO({ round_id: 'r1', revealed: false });

    expect(vista.playersPerRow).toBe(1);
  });

  it('trae si los equipos cuadran con el formato, y por defecto asume que sí', () => {
    const atascada = EnvelopeMapper.toEnvelopesViewDTO({
      round_id: 'r1',
      revealed: false,
      teams_fit_format: false,
    });
    const sinDato = EnvelopeMapper.toEnvelopesViewDTO({ round_id: 'r1', revealed: false });

    expect(atascada.teamsFitFormat).toBe(false);
    // Un backend viejo no manda el campo: avisar de un atasco inventado sería
    // peor que no avisar
    expect(sinDato.teamsFitFormat).toBe(true);
  });
});
