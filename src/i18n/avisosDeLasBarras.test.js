import { describe, it, expect } from 'vitest';
import es from './locales/es/competitions.json';
import en from './locales/en/competitions.json';
import esAgenda from './locales/es/schedule.json';
import enAgenda from './locales/en/schedule.json';

/**
 * C8: sin barra en un campo y sin poder cambiarla (competición en juego), a
 * quién se la pide: en una Ryder, a su capitán o al organizador; en stroke
 * play, al organizador. Con el nombre del campo, en los dos idiomas.
 */
describe('los avisos de pedir la barra', () => {
  it('es', () => {
    expect(es.tees.askCaptainOrOrganiser).toBe(
      'No tienes barra en {{course}}: pídesela a tu capitán o al organizador',
    );
    expect(es.tees.askOrganiser).toBe(
      'No tienes barra en {{course}}: pídesela al organizador',
    );
  });

  it('en', () => {
    expect(en.tees.askCaptainOrOrganiser).toBe(
      'You have no tee at {{course}}: ask your captain or the organiser',
    );
    expect(en.tees.askOrganiser).toBe(
      'You have no tee at {{course}}: ask the organiser',
    );
  });
});

/**
 * D10: en stroke play lo pendiente es una «partida»; en una Ryder, un
 * «partido». Cada texto de lo pendiente tiene las dos.
 */
describe('los fallos de lo pendiente según la modalidad', () => {
  const CLAVES = [
    'PENDING_GAME_NOT_RECALCULABLE',
    'TEE_NOT_ON_PENDING_COURSE',
    'cantRemove',
  ];

  it.each(CLAVES)(
    'es · %s: «partido» en la Ryder, «partida» en stroke play',
    (clave) => {
      expect(es.tees.errors[clave]).toMatch(/partido/);
      expect(es.tees.errorsStrokePlay[clave]).toMatch(/partida/);
      expect(es.tees.errorsStrokePlay[clave]).not.toMatch(/partido/);
    },
  );

  it.each(CLAVES)('en · %s: con texto en las dos', (clave) => {
    expect(en.tees.errors[clave]).toBeTruthy();
    expect(en.tees.errorsStrokePlay[clave]).toBeTruthy();
  });
});

describe('D11: el emparejado fuera de su equipo', () => {
  it('es y en', () => {
    expect(esAgenda.errors.PAIRING_PLAYER_NOT_IN_TEAM).toBe(
      'Hay un jugador emparejado fuera de su equipo',
    );
    expect(enAgenda.errors.PAIRING_PLAYER_NOT_IN_TEAM).toBe(
      'A paired player is not on their team',
    );
  });
});

/**
 * Textos vacíos cortos (pasada del Kind del 21 nov): a 360 px, junto a
 * «Fijar» y «Quitar», los largos no cabían.
 */
describe('los textos vacíos de los selectores de barra', () => {
  it('es: corto en las filas estrechas, largo en los selectores anchos', () => {
    expect(es.tees.chooseShort).toBe('Elige');
    expect(es.tees.choose).toBe('Elige una barra');
    expect(es.tees.noOwnOnCourse).toBe('Sin cambio propio');
    // Las filas de «Barras de los campos» usan la corta
    expect(es.tees.courses.notSet).toBeUndefined();
  });

  it('en', () => {
    expect(en.tees.chooseShort).toBe('Choose');
    expect(en.tees.choose).toBe('Choose a tee');
    expect(en.tees.noOwnOnCourse).toBe('No own change');
    expect(en.tees.courses.notSet).toBeUndefined();
  });
});
