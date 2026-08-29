import { describe, it, expect } from 'vitest';
import { ubicacionDe } from '../utils/ubicacionDeCompeticion';

/**
 * La ubicación que se ve en la tarjeta de cada competición.
 *
 * El backend la manda ya montada uniendo `name_en`, así que en una aplicación
 * en español decía «Spain, France» mientras la bandera de dos líneas más abajo
 * decía «España, Francia»: dos textos del mismo dato en idiomas distintos, en
 * la misma tarjeta (FE #513).
 */
describe('ubicacionDe', () => {
  const conDosPaises = {
    location: 'Spain, France',
    countries: [
      { code: 'ES', name: 'Spain', nameEn: 'Spain', nameEs: 'España' },
      { code: 'FR', name: 'France', nameEn: 'France', nameEs: 'Francia' },
    ],
  };

  it('usa el idioma de la aplicación, no el texto que manda el backend', () => {
    expect(ubicacionDe(conDosPaises, 'es')).toBe('España, Francia');
  });

  it('y en inglés dice lo mismo que decía antes', () => {
    expect(ubicacionDe(conDosPaises, 'en')).toBe('Spain, France');
  });

  it('sin países se queda con lo que mandó el backend, antes que dejar el hueco', () => {
    expect(ubicacionDe({ location: 'Spain', countries: [] }, 'es')).toBe('Spain');
  });

  it('sin nada, cadena vacía y la línea no se pinta', () => {
    expect(ubicacionDe({}, 'es')).toBe('');
    expect(ubicacionDe(null, 'es')).toBe('');
  });
});
