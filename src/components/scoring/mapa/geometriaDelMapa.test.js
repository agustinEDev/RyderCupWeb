import { describe, it, expect } from 'vitest';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import {
  enMedio,
  fraseDeLaLinea,
  geojsonDeLaLinea,
  geojsonDeLaMedida,
  geojsonDelHoyo,
  haciaElGreen,
  lineaParaMover,
  lngLat,
  mismoPunto,
  muestraDeLaEdicion,
  muestraValida,
  tipoDelPunto,
  tramosDeLaLinea,
  tramosDesdeMi,
} from './geometriaDelMapa';

const SALIDA = { lat: 36.28, lon: -5.33 };
const CODO = { lat: 36.2815, lon: -5.3302 };
const GREEN = { lat: 36.283, lon: -5.33 };
const LEJOS = { lat: 37.5, lon: -5.33 };
const t = (clave, opciones) => `${clave} ${JSON.stringify(opciones)}`;

describe('geometriaDelMapa', () => {
  describe('lngLat', () => {
    it('dado un punto {lat, lon}, cuando se pasa a MapLibre, entonces va como [lon, lat]', () => {
      expect(lngLat(SALIDA)).toEqual([-5.33, 36.28]);
    });
  });

  describe('geojsonDelHoyo', () => {
    it('dado un hoyo con línea y green, cuando se dibuja, entonces lleva la línea y el punto del green', () => {
      const datos = geojsonDelHoyo({ playLine: [SALIDA, GREEN], green: { center: GREEN } });

      expect(datos).toEqual({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: [lngLat(SALIDA), lngLat(GREEN)] } },
          { type: 'Feature', properties: { tipo: 'green' }, geometry: { type: 'Point', coordinates: lngLat(GREEN) } },
        ],
      });
    });

    it.each([
      ['sin hoyo', null],
      ['con un solo punto y sin green', { playLine: [SALIDA], green: null }],
    ])('dado un hoyo %s, cuando se dibuja, entonces no lleva nada', (_, hoyo) => {
      expect(geojsonDelHoyo(hoyo)).toEqual({ type: 'FeatureCollection', features: [] });
    });

    it('dado un hoyo solo con green, cuando se dibuja, entonces lleva solo el green', () => {
      expect(geojsonDelHoyo({ playLine: [], green: { center: GREEN } }).features.map((f) => f.properties.tipo)).toEqual(['green']);
    });
  });

  describe('geojsonDeLaLinea', () => {
    it('dada una línea de dos puntos o más, cuando se dibuja, entonces es una sola LineString', () => {
      expect(geojsonDeLaLinea([SALIDA, CODO, GREEN]).features).toEqual([
        { type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: [SALIDA, CODO, GREEN].map(lngLat) } },
      ]);
    });

    it.each([[[]], [[SALIDA]]])('dada una línea de menos de dos puntos (%j), cuando se dibuja, entonces no hay nada', (linea) => {
      expect(geojsonDeLaLinea(linea)).toEqual({ type: 'FeatureCollection', features: [] });
    });
  });

  describe('geojsonDeLaMedida', () => {
    it('dados dos tramos, cuando se dibujan, entonces cada uno es su LineString', () => {
      expect(geojsonDeLaMedida([[SALIDA, CODO], [CODO, GREEN]]).features.map((f) => f.geometry.coordinates)).toEqual([
        [lngLat(SALIDA), lngLat(CODO)],
        [lngLat(CODO), lngLat(GREEN)],
      ]);
    });

    it('dados ningún tramo, cuando se dibujan, entonces la colección va vacía', () => {
      expect(geojsonDeLaMedida([])).toEqual({ type: 'FeatureCollection', features: [] });
    });
  });

  describe('mismoPunto', () => {
    it.each([
      [SALIDA, { ...SALIDA }, true],
      [SALIDA, { lat: SALIDA.lat, lon: -5.331 }, false],
      [SALIDA, { lat: 36.281, lon: SALIDA.lon }, false],
      [null, SALIDA, false],
      [SALIDA, undefined, false],
    ])('dados %j y %j, cuando se comparan, entonces %s', (a, b, esperado) => {
      expect(mismoPunto(a, b)).toBe(esperado);
    });
  });

  describe('lineaParaMover', () => {
    it('dado un hoyo con salida y green de par 4, cuando se va a mover, entonces lleva su codo y acaba en el green', () => {
      const linea = lineaParaMover({ playLine: [SALIDA, GREEN], green: { center: GREEN } }, 4);

      expect(linea).toHaveLength(3);
      expect(linea[0]).toEqual(SALIDA);
      expect(linea.at(-1)).toEqual(GREEN);
    });

    it.each([
      ['sin hoyo', null],
      ['sin green', { playLine: [SALIDA, GREEN], green: null }],
    ])('dado un hoyo %s, cuando se va a mover, entonces no hay línea', (_, hoyo) => {
      expect(lineaParaMover(hoyo, 4)).toBeNull();
    });
  });

  describe('muestraValida y muestraDeLaEdicion', () => {
    it('dada una línea de 330 m junto al campo, cuando se cierra, entonces vale y sale como muestra', () => {
      expect(muestraValida([SALIDA, CODO, GREEN], SALIDA)).toBe(true);
      expect(muestraDeLaEdicion([SALIDA, CODO, GREEN], null, SALIDA)).toEqual({ tee: SALIDA, bends: [CODO], greenCenter: GREEN });
    });

    it('dada una línea con más codos de los que se guardan, cuando se cierra, entonces no vale', () => {
      const linea = [SALIDA, CODO, CODO, CODO, GREEN];

      expect(muestraValida(linea, SALIDA)).toBe(false);
      expect(muestraDeLaEdicion(linea, null, SALIDA)).toBe(false);
    });

    it('dada una línea con el green a menos de 40 m, cuando se cierra, entonces no vale', () => {
      expect(muestraValida([SALIDA, { lat: 36.2801, lon: -5.33 }], SALIDA)).toBe(false);
    });

    it('dada una línea lejos del campo, cuando se cierra, entonces no vale; sin campo conocido, sí', () => {
      expect(muestraValida([SALIDA, GREEN], LEJOS)).toBe(false);
      expect(muestraValida([SALIDA, GREEN], null)).toBe(true);
    });

    it('dado solo un green junto al campo, cuando se cierra, entonces sale sin salida ni codos', () => {
      expect(muestraDeLaEdicion(null, GREEN, SALIDA)).toEqual({ tee: null, bends: [], greenCenter: GREEN });
    });

    it('dado solo un green lejos del campo, o nada, cuando se cierra, entonces no hay muestra', () => {
      expect(muestraDeLaEdicion(null, LEJOS, SALIDA)).toBe(false);
      expect(muestraDeLaEdicion(null, null, SALIDA)).toBeNull();
    });
  });

  describe('tramosDesdeMi', () => {
    it('dada tu posición y el green, cuando no se ha movido el codo, entonces un solo tramo de ti al green', () => {
      expect(tramosDesdeMi(SALIDA, null, { center: GREEN })).toEqual([[SALIDA, GREEN]]);
    });

    it('dado el codo movido, cuando se mide, entonces dos tramos: de ti al codo y del codo al green', () => {
      expect(tramosDesdeMi(SALIDA, CODO, { center: GREEN })).toEqual([[SALIDA, CODO], [CODO, GREEN]]);
    });

    it.each([
      ['sin posición', null, { center: GREEN }],
      ['sin green', SALIDA, null],
    ])('%s, cuando se mide, entonces no hay tramos', (_, posicion, green) => {
      expect(tramosDesdeMi(posicion, CODO, green)).toEqual([]);
    });
  });

  describe('enMedio y haciaElGreen', () => {
    it('dados dos puntos, cuando se busca el medio, entonces es la media de cada coordenada', () => {
      expect(enMedio({ lat: 0, lon: 0 }, { lat: 4, lon: 8 })).toEqual({ lat: 2, lon: 4 });
    });

    it('dados dos puntos, cuando se busca dónde va la cifra de ti al green, entonces a 3/4 hacia el segundo', () => {
      expect(haciaElGreen({ lat: 0, lon: 0 }, { lat: 4, lon: 8 })).toEqual({ lat: 3, lon: 6 });
    });
  });

  describe('tramosDeLaLinea y tipoDelPunto', () => {
    it('dada una línea de tres puntos, cuando se parte, entonces dos tramos seguidos', () => {
      expect(tramosDeLaLinea([SALIDA, CODO, GREEN])).toEqual([[SALIDA, CODO], [CODO, GREEN]]);
      expect(tramosDeLaLinea([SALIDA])).toEqual([]);
    });

    it('dada una línea de cuatro puntos, cuando se mira cada uno, entonces salida, codo, codo y green', () => {
      const linea = [SALIDA, CODO, CODO, GREEN];

      expect(linea.map((_, i) => tipoDelPunto(i, linea))).toEqual(['salida', 'codo', 'codo', 'green']);
    });
  });

  describe('fraseDeLaLinea', () => {
    const metros = (a, b) => distanciaEnMetros(a, b);

    it('dada una línea sin tramos, cuando se lee, entonces no hay frase', () => {
      expect(fraseDeLaLinea([], t)).toBeNull();
      expect(fraseDeLaLinea([SALIDA], t)).toBeNull();
    });

    it.each([
      ['un tramo', [SALIDA, GREEN], 'mapa.lineaUnTramo'],
      ['dos tramos', [SALIDA, CODO, GREEN], 'mapa.lineaDosTramos'],
      ['tres tramos', [SALIDA, CODO, CODO, GREEN], 'mapa.lineaTresTramos'],
    ])('dada una línea de %s, cuando se lee, entonces usa su clave con sus metros', (_, linea, clave) => {
      const lista = tramosDeLaLinea(linea).map(([p, q]) => metros(p, q));
      const [a, b, c] = lista;

      expect(fraseDeLaLinea(linea, t)).toBe(t(clave, { a, b, c }));
    });

    it('dada una línea de más de tres tramos, cuando se lee, entonces va en lista', () => {
      const linea = [SALIDA, CODO, GREEN, CODO, SALIDA];
      const lista = tramosDeLaLinea(linea).map(([p, q]) => metros(p, q));

      expect(fraseDeLaLinea(linea, t)).toBe(t('mapa.lineaVariosTramos', { lista: lista.join(' · ') }));
    });
  });
});
