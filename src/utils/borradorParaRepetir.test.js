import { describe, it, expect } from 'vitest';
import { borradorParaRepetir } from './borradorParaRepetir';

/**
 * El borrador del asistente para repetir una partida rápida (FE #1021).
 * Tabla aprobada por Agustín el 3 nov 2026 (R4-R11, y lo decidido después):
 *
 *   #    caso                                       | borrador
 *   -----|-------------------------------------------|----------------------------------
 *   R4   todo vale                                  | Resumen (paso 4), todo copiado:
 *        |                                           | nombre, modo, formato, campo, %,
 *        |                                           | hándicap/scratch, barras, equipos
 *   R5   hándicaps                                  | registrados, el de hoy (perfil o
 *        |                                           | lista de amigos); invitados, el de
 *        |                                           | aquella partida
 *   R6   repite quien no la creó                    | primero quien repite; el creador
 *        |                                           | original, como un amigo más
 *   R7   uno ya no es amigo                         | fuera; paso 2, aviso con su nombre
 *   R8   el campo ya no está aprobado (o no está)   | paso 1, sin campo ni jugadores
 *   R9a  tu barra ya no existe                      | paso 1, sin tu barra, aviso
 *   R9b  la de otro ya no existe                    | fuera; paso 2, aviso con su
 *        |                                           | nombre y la barra (3 nov: se
 *        |                                           | vuelve a añadir con otra)
 *   R10  por parejas y falta uno                    | paso 2 (equipos incompletos)
 *   R11  anotadores                                 | los que siguen, y siempre quien
 *        |                                           | repite (el servidor lo exige)
 *   R12  un invitado                                | id nuevo del borrador; nombre y
 *        |                                           | apellidos por separado
 */

const tee = (color, gender = 'MALE') => ({ color, gender });
const campo = (tees = [tee('YELLOW'), tee('RED', 'FEMALE'), tee('WHITE')], aprobado = true) => ({
  id: 'gc-1',
  name: 'El Prat',
  tees,
  isApproved: () => aprobado,
});
const yo = { id: 'u-yo', display_name: 'Yo Mismo', handicap: 12.4 };
const amigo = (id, nombre, handicap) => ({ otherUserId: id, otherUserName: nombre, otherUserHandicap: handicap });
const AMIGOS = [amigo('u-ana', 'Ana', 18), amigo('u-luis', 'Luis', 9.1)];

const jugador = (userId, extra = {}) => ({
  participantId: userId,
  userId,
  name: userId,
  firstName: null,
  lastName: null,
  handicap: 99,
  team: null,
  isGuest: false,
  color: 'YELLOW',
  teeGender: 'MALE',
  ...extra,
});
const invitado = (extra = {}) => ({
  participantId: 'p-pepe',
  userId: null,
  name: 'Pepe Pérez',
  firstName: 'Pepe',
  lastName: 'Pérez',
  handicap: 22,
  team: null,
  isGuest: true,
  color: 'WHITE',
  teeGender: 'MALE',
  ...extra,
});

const partida = (extra = {}) => ({
  name: 'Domingo en El Prat',
  golfCourseId: 'gc-1',
  matchFormat: null,
  scoringFormat: 'STABLEFORD',
  allowancePercentage: 95,
  playMode: 'HANDICAP',
  participants: [jugador('u-yo'), jugador('u-ana', { color: 'RED', teeGender: 'FEMALE' }), invitado()],
  scorerIds: ['u-yo', 'u-ana'],
  ...extra,
});

const repite = (extra = {}) => borradorParaRepetir({ partida: partida(), yo, amigos: AMIGOS, campo: campo(), ...extra });
const nombres = (b) => b.inicial.participants.map((p) => p.name);

describe('borradorParaRepetir', () => {
  it('R4: todo vale, al Resumen con todo copiado', () => {
    const b = repite();

    expect(b.paso).toBe(4);
    expect(b.avisos).toEqual([]);
    expect(b.inicial).toMatchObject({
      matchName: 'Domingo en El Prat',
      mode: 'FREE_PLAY',
      scoringFormat: 'STABLEFORD',
      allowanceOverride: 95,
      playMode: 'HANDICAP',
      creatorTeeKey: 'YELLOW|MALE',
    });
    expect(b.inicial.selectedCourse.id).toBe('gc-1');
    expect(b.inicial.participants.map((p) => [p.name, p.color, p.teeGender])).toEqual([
      ['Yo Mismo', 'YELLOW', 'MALE'],
      ['Ana', 'RED', 'FEMALE'],
      ['Pepe Pérez', 'WHITE', 'MALE'],
    ]);
  });

  it('R4: match play conserva su formato y los equipos', () => {
    const b = repite({
      partida: partida({
        matchFormat: 'FOURBALL',
        scoringFormat: null,
        participants: [
          jugador('u-yo', { team: 'A' }),
          jugador('u-ana', { team: 'A', color: 'RED', teeGender: 'FEMALE' }),
          jugador('u-luis', { team: 'B' }),
          invitado({ team: 'B' }),
        ],
      }),
    });

    expect(b.paso).toBe(4);
    expect(b.inicial).toMatchObject({ mode: 'MATCH_PLAY', matchFormat: 'FOURBALL' });
    expect(b.inicial.participants.map((p) => p.team)).toEqual(['A', 'A', 'B', 'B']);
  });

  it('R5: registrados con el hándicap de hoy; el invitado, con el de aquella partida', () => {
    const b = repite();

    expect(b.inicial.participants.map((p) => [p.handicap, p.profileHandicap])).toEqual([
      [12.4, 12.4],
      [18, 18],
      [22, undefined],
    ]);
  });

  it('R6: si la creó otro, quien repite va primero y el creador entra como un amigo más', () => {
    const b = repite({
      partida: partida({ participants: [jugador('u-luis'), jugador('u-yo', { color: 'WHITE' })] }),
    });

    expect(nombres(b)).toEqual(['Yo Mismo', 'Luis']);
    expect(b.inicial.creatorTeeKey).toBe('WHITE|MALE');
    expect(b.inicial.participants[1]).toMatchObject({ userId: 'u-luis', handicap: 9.1, isGuest: false });
  });

  it('R7: quien ya no es amigo se queda fuera, con aviso, en Jugadores', () => {
    const b = repite({ amigos: [amigo('u-luis', 'Luis', 9.1)] });

    expect(nombres(b)).toEqual(['Yo Mismo', 'Pepe Pérez']);
    expect(b.paso).toBe(2);
    expect(b.avisos).toEqual([{ tipo: 'noAmigo', nombre: 'u-ana' }]);
  });

  it.each([
    ['no aprobado', campo(undefined, false)],
    ['que ya no está', null],
  ])('R8: campo %s, al paso 1 sin campo ni jugadores', (_, elCampo) => {
    const b = repite({ campo: elCampo });

    expect(b.paso).toBe(1);
    expect(b.avisos).toEqual([{ tipo: 'campo' }]);
    expect(b.inicial.selectedCourse).toBeNull();
    expect(b.inicial.creatorTeeKey).toBe('');
    expect(b.inicial.participants).toEqual([]);
    expect(b.inicial.matchName).toBe('Domingo en El Prat');
  });

  it('R9a: tu barra ya no existe, al paso 1 sin ella', () => {
    const b = repite({ campo: campo([tee('RED', 'FEMALE'), tee('WHITE')]) });

    expect(b.paso).toBe(1);
    expect(b.inicial.creatorTeeKey).toBe('');
    expect(b.avisos).toEqual([{ tipo: 'barra', propia: true, color: 'YELLOW' }]);
  });

  it('R9b: la barra de otro ya no existe, fuera y aviso, en Jugadores', () => {
    const b = repite({ campo: campo([tee('YELLOW'), tee('WHITE')]) });

    expect(nombres(b)).toEqual(['Yo Mismo', 'Pepe Pérez']);
    expect(b.paso).toBe(2);
    expect(b.avisos).toEqual([{ tipo: 'barra', propia: false, nombre: 'Ana', color: 'RED' }]);
  });

  it('R9: un campo sin barras no quita a nadie', () => {
    const b = repite({ campo: campo([]) });

    expect(b.paso).toBe(4);
    expect(nombres(b)).toEqual(['Yo Mismo', 'Ana', 'Pepe Pérez']);
  });

  it('R10: por parejas y falta uno, en Jugadores', () => {
    const b = repite({
      amigos: [amigo('u-luis', 'Luis', 9.1)],
      partida: partida({
        matchFormat: 'FOURBALL',
        scoringFormat: null,
        participants: [
          jugador('u-yo', { team: 'A' }),
          jugador('u-ana', { team: 'A' }),
          jugador('u-luis', { team: 'B' }),
          invitado({ team: 'B' }),
        ],
      }),
    });

    expect(b.paso).toBe(2);
    expect(b.inicial.participants.map((p) => p.team)).toEqual(['A', 'B', 'B']);
  });

  it('R11: anotadores que siguen, y siempre quien repite', () => {
    expect(repite().inicial.scorerIds).toEqual(['u-yo', 'u-ana']);
    expect(repite({ amigos: [] }).inicial.scorerIds).toEqual(['u-yo']);
    expect(repite({ partida: partida({ scorerIds: ['u-ana'] }) }).inicial.scorerIds).toEqual(['u-yo', 'u-ana']);
  });

  it('R12: el invitado lleva un id nuevo y su nombre y apellidos por separado', () => {
    const pepe = repite().inicial.participants[2];

    expect(pepe.participantId).not.toBe('p-pepe');
    expect(pepe.participantId).toMatch(/^invitado-/);
    expect(pepe).toMatchObject({ userId: null, isGuest: true, firstName: 'Pepe', lastName: 'Pérez' });
  });
});
