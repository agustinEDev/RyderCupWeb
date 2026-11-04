import { describe, it, expect } from 'vitest';
import { anotadoresAlVolver } from './anotadoresAlVolver';

/**
 * Qué anotadores quedan al volver al paso 3 tras cambiar los jugadores
 * (tabla aprobada por Agustín el 4 nov 2026). Lo que se elige es la lista de
 * quienes pueden anotar; tú anotas siempre (el servidor lo exige). `null` es
 * «los de por defecto» (solo tú; en foursomes, las dos parejas).
 *
 *   #    caso                                       | anotadores
 *   -----|-------------------------------------------|----------------------------------
 *   A1   quitas a uno que anotaba                   | los demás que anotaban
 *   A2   metes a uno nuevo                          | no anota; los demás, igual
 *   A3   quitas a uno que no anotaba                | igual
 *   A4   cambias a alguien de equipo (no foursomes) | igual
 *   A5   foursomes                                  | se conserva «las dos parejas» o
 *        |                                           | «solo la mía» con quien juega
 *        |                                           | ahora; sin registrado enfrente,
 *        |                                           | «solo la mía». Lo que puso la app
 *        |                                           | sin preguntar no es una elección:
 *        |                                           | los de por defecto (revisor)
 *   A6   otra modalidad u otro formato de match play| los de por defecto
 *   A8   tú anotas siempre                          | también si no estabas en la lista
 *   A10  la primera vez (no hubo elección)          | los de por defecto
 *   (A7 sin cambios y A9 al crear desde cero: en el modal)
 */

const yo = { participantId: 'yo', userId: 'yo', isGuest: false, team: null };
const ana = { participantId: 'ana', userId: 'ana', isGuest: false, team: null };
const luis = { participantId: 'luis', userId: 'luis', isGuest: false, team: null };
const pedro = { participantId: 'pedro', userId: 'pedro', isGuest: false, team: null };
const pepe = { participantId: 'invitado-1', userId: null, isGuest: true, team: null };

const libre = (jugadores) => ({ jugadores, modo: 'FREE_PLAY', formato: 'SINGLES' });

describe('anotadoresAlVolver', () => {
  it('A1: quitas a uno que anotaba: siguen los demás que anotaban', () => {
    const antes = libre([yo, ana, luis]);
    expect(anotadoresAlVolver({ antes, ahora: libre([yo, ana]), anotadores: ['yo', 'ana', 'luis'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  it('A2: metes a uno nuevo: no anota, y los demás siguen igual', () => {
    const antes = libre([yo, ana]);
    expect(anotadoresAlVolver({ antes, ahora: libre([yo, ana, pedro]), anotadores: ['yo', 'ana'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  it('A3: quitas a uno que no anotaba (un invitado): igual', () => {
    const antes = libre([yo, ana, pepe]);
    expect(anotadoresAlVolver({ antes, ahora: libre([yo, ana]), anotadores: ['yo', 'ana'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  it('A4: cambias a alguien de equipo (fourball): igual', () => {
    const fourball = (jugadores) => ({ jugadores, modo: 'MATCH_PLAY', formato: 'FOURBALL' });
    const antes = fourball([{ ...yo, team: 'A' }, { ...ana, team: 'A' }, { ...luis, team: 'B' }, { ...pedro, team: 'B' }]);
    const ahora = fourball([{ ...yo, team: 'A' }, { ...ana, team: 'B' }, { ...luis, team: 'A' }, { ...pedro, team: 'B' }]);
    expect(anotadoresAlVolver({ antes, ahora, anotadores: ['yo', 'ana'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  describe('A5: foursomes (se conserva la elección de parejas, no se deduce de quién anota)', () => {
    const foursomes = (jugadores) => ({ jugadores, modo: 'MATCH_PLAY', formato: 'FOURSOMES' });
    const conEquipo = (p, team) => ({ ...p, team });
    const conRivalRegistrado = foursomes([conEquipo(yo, 'A'), conEquipo(pepe, 'A'), conEquipo(pedro, 'B'), conEquipo(ana, 'B')]);
    const antes = foursomes([conEquipo(yo, 'A'), conEquipo(pepe, 'A'), conEquipo(luis, 'B'), conEquipo(ana, 'B')]);

    it('«las dos parejas» se conserva con quien juega ahora enfrente', () => {
      expect(anotadoresAlVolver({ antes, ahora: conRivalRegistrado, anotadores: ['yo', 'luis', 'ana'], yo: 'yo', parejas: 'BOTH' })).toEqual(['yo', 'pedro', 'ana']);
    });

    it('«solo la mía» se conserva, con mi pareja de ahora (aunque cambie de letra)', () => {
      const ahora = foursomes([conEquipo(yo, 'B'), conEquipo(pedro, 'B'), conEquipo(luis, 'A'), conEquipo(ana, 'A')]);
      expect(anotadoresAlVolver({ antes, ahora, anotadores: ['yo'], yo: 'yo', parejas: 'MINE' })).toEqual(['yo', 'pedro']);
    });

    it('«las dos parejas» sin nadie registrado enfrente: «solo la mía» (sin olvidar la elección)', () => {
      const otroInvitado = { ...pepe, participantId: 'invitado-2' };
      const ahora = foursomes([conEquipo(yo, 'A'), conEquipo(ana, 'A'), conEquipo(otroInvitado, 'B'), conEquipo(pepe, 'B')]);
      expect(anotadoresAlVolver({ antes, ahora, anotadores: ['yo', 'ana', 'luis'], yo: 'yo', parejas: 'BOTH' })).toEqual(['yo', 'ana']);
    });

    it('sin elección (la puso la app porque enfrente no había registrados): los de por defecto', () => {
      expect(anotadoresAlVolver({ antes, ahora: conRivalRegistrado, anotadores: ['yo'], yo: 'yo', parejas: null })).toBeNull();
    });
  });

  it.each([
    ['otra modalidad', libre([yo, ana]), { jugadores: [yo, ana], modo: 'MATCH_PLAY', formato: 'SINGLES' }],
    [
      'otro formato de match play',
      { jugadores: [yo, ana, luis, pedro], modo: 'MATCH_PLAY', formato: 'FOURBALL' },
      { jugadores: [yo, ana, luis, pedro], modo: 'MATCH_PLAY', formato: 'FOURSOMES' },
    ],
    [
      'de foursomes a fourball',
      { jugadores: [yo, ana, luis, pedro], modo: 'MATCH_PLAY', formato: 'FOURSOMES' },
      { jugadores: [yo, ana, luis, pedro], modo: 'MATCH_PLAY', formato: 'FOURBALL' },
    ],
  ])('A6: %s: los de por defecto', (_, antes, ahora) => {
    expect(anotadoresAlVolver({ antes, ahora, anotadores: ['yo', 'ana'], yo: 'yo' })).toBeNull();
  });

  it('A6: en stroke play, otro formato (Stableford o Medal) no cambia nada', () => {
    const antes = { jugadores: [yo, ana], modo: 'FREE_PLAY', formato: 'SINGLES' };
    const ahora = { jugadores: [yo, ana, luis], modo: 'FREE_PLAY', formato: 'FOURBALL' };
    expect(anotadoresAlVolver({ antes, ahora, anotadores: ['yo', 'ana'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  it('A8: tú anotas siempre, también si no estabas en la lista', () => {
    expect(anotadoresAlVolver({ antes: libre([yo, ana]), ahora: libre([yo, ana, luis]), anotadores: ['ana'], yo: 'yo' })).toEqual(['yo', 'ana']);
  });

  it('A10: la primera vez (no hubo elección): los de por defecto', () => {
    expect(anotadoresAlVolver({ antes: null, ahora: libre([yo, ana]), anotadores: [], yo: 'yo' })).toBeNull();
  });
});
