import { describe, it, expect } from 'vitest';
import es from './locales/es/competitions.json';
import en from './locales/en/competitions.json';

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
