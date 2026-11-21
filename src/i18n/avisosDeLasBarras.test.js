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
