import { describe, it, expect } from 'vitest';
import es from './locales/es/schedule.json';
import en from './locales/en/schedule.json';

/**
 * Cada modo de reparto del backend tiene su texto en los dos idiomas.
 *
 * Visto en el Kind el 23 sep: el reparto salido de una sala de draft pintaba
 * «Modo de Asignación: teams.draft». `DRAFT` se añadió al backend con la sala
 * y su traducción se quedó por el camino, e i18next devuelve la clave cuando
 * no la encuentra, así que el fallo sale a pantalla tal cual.
 */

// Los de `TeamAssignmentMode` del backend, en minúscula como los pinta la tarjeta
const MODOS = ['automatic', 'manual', 'draft'];

describe('Los modos de reparto están traducidos', () => {
  it.each(['es', 'en'])('en %s no falta ninguno', (idioma) => {
    const textos = (idioma === 'es' ? es : en).teams;

    const sinTraducir = MODOS.filter((modo) => !textos[modo]);

    expect(sinTraducir).toEqual([]);
  });

  it('y no son la clave repetida', () => {
    for (const modo of MODOS) {
      expect(es.teams[modo]).not.toMatch(/^teams\./);
      expect(en.teams[modo]).not.toMatch(/^teams\./);
    }
  });
});
