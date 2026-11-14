import { describe, it, expect, vi } from 'vitest';
import {
  ESPAÑA,
  ESTILO,
  ZOOM_SIN_MAPA,
  opcionesDelMapa,
  ponerCapasDelHoyo,
} from './estiloDelMapa';
import { geojsonDelHoyo } from './geometriaDelMapa';

const NODO = { soy: 'el contenedor' };
const CENTRO = { lat: 36.28, lon: -5.33 };

describe('estiloDelMapa', () => {
  describe('opcionesDelMapa', () => {
    it('dado un hoyo con mapa, cuando se crea, entonces con su rumbo y sin girar, acercado a su centro', () => {
      expect(
        opcionesDelMapa(NODO, { orientado: true, rumbo: 37, centro: CENTRO }),
      ).toEqual({
        container: NODO,
        style: ESTILO,
        attributionControl: false,
        bearing: 37,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        doubleClickZoom: false,
        center: [-5.33, 36.28],
        zoom: ZOOM_SIN_MAPA,
      });
    });

    it('dado un hoyo sin mapa, cuando se crea, entonces el norte arriba y se puede girar', () => {
      const opciones = opcionesDelMapa(NODO, {
        orientado: false,
        rumbo: 37,
        centro: CENTRO,
      });

      expect(opciones.bearing).toBe(0);
      expect(opciones.dragRotate).toBe(true);
    });

    it('dado que no se sabe dónde está el hoyo, cuando se crea, entonces España entera', () => {
      const opciones = opcionesDelMapa(NODO, {
        orientado: false,
        rumbo: null,
        centro: null,
      });

      expect(opciones.center).toEqual(ESPAÑA.center);
      expect(opciones.zoom).toBe(ESPAÑA.zoom);
    });

    it('dado el estilo, cuando no hay teselas, entonces el fondo gris va debajo de la PNOA', () => {
      expect(ESTILO.layers.map((c) => c.id)).toEqual(['fondo', 'pnoa']);
      expect(ESTILO.sources.pnoa.maxzoom).toBe(20);
    });
  });

  describe('ponerCapasDelHoyo', () => {
    it('dado el estilo cargado, cuando se ponen las capas, entonces las fuentes y capas del hoyo en su orden', () => {
      const llamadas = [];
      const mapa = {
        addSource: vi.fn((id, fuente) =>
          llamadas.push(['fuente', id, fuente.data]),
        ),
        addLayer: vi.fn((capa) =>
          llamadas.push(['capa', capa.id, capa.source]),
        ),
      };
      const hoyo = {
        playLine: [CENTRO, { lat: 36.283, lon: -5.33 }],
        green: null,
      };
      const medida = { type: 'FeatureCollection', features: ['medida'] };
      const linea = { type: 'FeatureCollection', features: ['linea'] };

      ponerCapasDelHoyo(mapa, { hoyo, medida, linea });

      expect(llamadas).toEqual([
        ['fuente', 'hoyo', geojsonDelHoyo(hoyo)],
        ['capa', 'linea-de-juego', 'hoyo'],
        ['fuente', 'medida', medida],
        ['capa', 'medida-linea', 'medida'],
        ['fuente', 'marcado', linea],
        ['capa', 'marcado-linea', 'marcado'],
        ['capa', 'green', 'hoyo'],
      ]);
      expect(mapa.addLayer.mock.calls[0][0].filter).toEqual([
        '==',
        ['get', 'tipo'],
        'linea',
      ]);
      expect(mapa.addLayer.mock.calls[3][0].filter).toEqual([
        '==',
        ['get', 'tipo'],
        'green',
      ]);
    });
  });
});
