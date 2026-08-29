// src/services/countries.test.js

import { describe, it, expect } from 'vitest';
import { sortCountriesByName, formatCountryName } from './countries';

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

  it('normaliza igual el nombre que pinta y el idioma con el que ordena', () => {
    // El guion bajo llegaba a los dos sitios y se resolvía distinto: el nombre
    // salía en inglés (se partía solo por el guion) y la comparación se hacía
    // con reglas del español. Eso es ordenar una lista por algo que no es lo
    // que se ve, que es justo el desorden que arregla esta issue
    expect(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'es_ES')))
      .toEqual(codes(sortCountriesByName(ORDENADOS_EN_INGLES, 'es')));
    expect(formatCountryName(ORDENADOS_EN_INGLES[0], 'es_ES')).toBe('Sudáfrica');
  });

  it('ordena con la intercalación del idioma que de verdad se pinta', () => {
    // La Ñ va entre la N y la O en español, y detrás de la Z en inglés: si el
    // nombre y la comparación no vinieran del mismo idioma, esto los separaría
    const conEnie = [
      { code: 'NO', name_en: 'Norway', name_es: 'Noruega' },
      { code: 'XX', name_en: 'Nandu Land', name_es: 'Ñandú' },
      { code: 'PT', name_en: 'Portugal', name_es: 'Portugal' },
    ];

    expect(codes(sortCountriesByName(conEnie, 'es_ES'))).toEqual(['NO', 'XX', 'PT']);
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

describe('formatCountryName con la forma que arma CompetitionAssembler (FE #513)', () => {
  // El assembler expone `nameEs`/`nameEn` y rellena `name` con el inglés fijo,
  // así que un país que llegara así caía al `name` de reserva y en español se
  // leía «Spain» dentro de una aplicación en español
  const comoElAssembler = { code: 'ES', name: 'Spain', nameEn: 'Spain', nameEs: 'España' };

  it('usa el español cuando la aplicación está en español', () => {
    expect(formatCountryName(comoElAssembler, 'es')).toBe('España');
  });

  it('también con la etiqueta larga del navegador', () => {
    expect(formatCountryName(comoElAssembler, 'es-ES')).toBe('España');
  });

  it('usa el inglés cuando la aplicación está en inglés', () => {
    expect(formatCountryName(comoElAssembler, 'en')).toBe('Spain');
  });

  it('sigue entendiendo la forma del backend', () => {
    expect(formatCountryName({ code: 'PT', name_es: 'Portugal', name_en: 'Portugal' }, 'es')).toBe('Portugal');
  });

  it('cae al nombre suelto solo si no hay ninguno de los dos', () => {
    expect(formatCountryName({ code: 'FR', name: 'France' }, 'es')).toBe('France');
  });
  it('con solo el código devuelve cadena vacía, no el código', () => {
    // Por esto la ficha del campo dentro de una competición enseñaba una
    // etiqueta VACÍA al lado de la bandera: el backend solo manda
    // `country_code` ahí, y quien pinta tiene que poner su propia reserva
    expect(formatCountryName({ code: 'ES' }, 'es')).toBe('');
  });
});
