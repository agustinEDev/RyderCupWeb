// src/services/countries.test.js

import { describe, it, expect } from 'vitest';
import { sortCountriesByName } from './countries';

// El listado llega del backend ordenado por el nombre en inglés, y la interfaz
// pinta el del idioma activo. Estos cuatro son el ejemplo de la issue #375: en
// inglés van seguidos, en español quedan entreverados.
const ORDENADOS_EN_INGLES = [
  { code: 'ZA', name_en: 'South Africa', name_es: 'Sudáfrica' },
  { code: 'KR', name_en: 'South Korea', name_es: 'Corea del Sur' },
  { code: 'SS', name_en: 'South Sudan', name_es: 'Sudán del Sur' },
  { code: 'ES', name_en: 'Spain', name_es: 'España' },
];

const codes = (countries) => countries.map(c => c.code);

describe('sortCountriesByName', () => {
  it('ordena por el nombre del idioma pedido, no por el inglés', () => {
    expect(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'es')))
      .toEqual(['KR', 'ES', 'ZA', 'SS']);
  });

  it('deja el orden inglés cuando el idioma es el inglés', () => {
    expect(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'en')))
      .toEqual(['ZA', 'KR', 'SS', 'ES']);
  });

  it('trata la tilde como la vocal que es', () => {
    // Comparando por código de carácter, "á" (U+00E1) va detrás de cualquier
    // letra ASCII y Suecia adelantaría a Sudán
    const conTilde = [
      { code: 'SE', name_en: 'Sweden', name_es: 'Suecia' },
      { code: 'SS', name_en: 'South Sudan', name_es: 'Sudán del Sur' },
    ];

    expect(codes(sortCountriesByName(conTilde, 'es'))).toEqual(['SS', 'SE']);
  });

  it('entiende las variantes regionales del idioma', () => {
    // El detector de i18next devuelve "es-ES", no "es"
    expect(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'es-ES')))
      .toEqual(['KR', 'ES', 'ZA', 'SS']);
  });

  it('no se rompe con una etiqueta de idioma que Intl no acepta', () => {
    // El idioma sale del detector de i18next, que lee `i18nextLng` de
    // localStorage sin lista de valores permitidos: ahí puede haber quedado un
    // "es_ES" con guion bajo o una cadena vacía. Intl los rechaza con
    // RangeError, y esto se ejecuta dentro de un useMemo en pleno render, así
    // que reventaría toda pantalla con selector de país en vez de degradarse
    for (const language of ['es_ES', '', '  ', 'no-es-un-idioma', null, undefined]) {
      expect(() => sortCountriesByName(ORDENADOS_EN_INGLES, language)).not.toThrow();
      expect(sortCountriesByName(ORDENADOS_EN_INGLES, language)).toHaveLength(4);
    }
  });

  it('ordena por el nombre que se pinta, aunque el idioma no se resuelva', () => {
    // formatCountryName normaliza partiendo por el guion, así que con "es_ES"
    // no reconoce el español y devuelve los nombres en inglés. Lo que importa
    // es que el orden acompañe a lo que se ve: si se mostrasen nombres ingleses
    // ordenados en español volvería el desorden que arregla esta issue
    expect(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'es_ES')))
      .toEqual(['ZA', 'KR', 'SS', 'ES']);
  });

  it('no toca la lista que recibe', () => {
    const original = [...ORDENADOS_EN_INGLES];

    sortCountriesByName(ORDENADOS_EN_INGLES, 'es');

    expect(ORDENADOS_EN_INGLES).toEqual(original);
  });

  it('devuelve una lista vacía si no le dan uno', () => {
    // Las páginas arrancan con [] y algunas dejan el estado en null si la
    // petición falla: ordenar no debe ser el que rompa
    expect(sortCountriesByName(null, 'es')).toEqual([]);
    expect(sortCountriesByName(undefined, 'es')).toEqual([]);
    expect(sortCountriesByName([], 'es')).toEqual([]);
  });
});
