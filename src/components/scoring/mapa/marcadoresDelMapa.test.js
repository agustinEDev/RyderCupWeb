import { describe, it, expect, vi } from 'vitest';

// Un marcador de MapLibre de mentira: guarda dónde está y si se quitó
const creados = vi.hoisted(() => []);
vi.mock('maplibre-gl', () => {
  class Marker {
    constructor(opciones) {
      this.opciones = opciones;
      this.remove = vi.fn();
      creados.push(this);
    }
    setLngLat(p) {
      this.p = p;
      return this;
    }
    addTo(mapa) {
      this.mapa = mapa;
      return this;
    }
    getElement() {
      return this.opciones.element;
    }
  }
  return { Marker };
});

const { CLASE_DEL_PUNTO, etiqueta, punto, sincronizarCifras } =
  await import('./marcadoresDelMapa');
const { distanciaEnMetros } =
  await import('../../../domain/services/distanciasAlGreen');

const A = { lat: 36.28, lon: -5.33 };
const B = { lat: 36.282, lon: -5.33 };
const C = { lat: 36.284, lon: -5.33 };
const texto = (metros) => `${metros} m`;

describe('marcadoresDelMapa', () => {
  it('dada una clase, cuando se hace un punto, entonces es un div con ella', () => {
    const el = punto(CLASE_DEL_PUNTO.green);

    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe(CLASE_DEL_PUNTO.green);
  });

  it('dada la cifra de la línea, cuando se hace, entonces blanca y oculta al lector (va en la frase)', () => {
    const el = etiqueta('linea', 'text-white');

    expect(el.dataset.tramo).toBe('linea');
    expect(el).toHaveClass('font-mono', 'text-white');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('dada la cifra de medir, cuando se hace, entonces el lector sí la ve', () => {
    const el = etiqueta('medida', 'text-yellow-300');

    expect(el.dataset.tramo).toBe('medida');
    expect(el).not.toHaveAttribute('aria-hidden');
  });

  describe('sincronizarCifras', () => {
    it('dados dos tramos y ninguna cifra, cuando se sincroniza, entonces una por tramo, en medio y con sus metros', () => {
      creados.length = 0;
      const mapa = {};
      const etiquetas = [];

      sincronizarCifras(
        mapa,
        etiquetas,
        [
          [A, B],
          [B, C],
        ],
        { tipo: 'linea', color: 'text-white', texto },
      );

      expect(etiquetas).toHaveLength(2);
      expect(etiquetas.every((m) => m.mapa === mapa)).toBe(true);
      expect(etiquetas[0].p).toEqual([-5.33, 36.281]);
      expect(etiquetas[0].getElement().textContent).toBe(
        texto(distanciaEnMetros(A, B)),
      );
      expect(etiquetas[1].getElement().dataset.tramo).toBe('linea');
    });

    it('dadas cifras de antes, cuando cambian los tramos, entonces se mueven y reescriben, y sobran las que no tienen tramo', () => {
      creados.length = 0;
      const etiquetas = [];
      sincronizarCifras(
        {},
        etiquetas,
        [
          [A, B],
          [B, C],
        ],
        { tipo: 'medida', color: 'text-yellow-300', texto },
      );
      const [primera, segunda] = etiquetas;

      sincronizarCifras({}, etiquetas, [[A, C]], {
        tipo: 'medida',
        color: 'text-yellow-300',
        texto,
        donde: (a) => a,
      });

      expect(creados).toHaveLength(2);
      expect(etiquetas).toEqual([primera]);
      expect(segunda.remove).toHaveBeenCalledTimes(1);
      expect(primera.remove).not.toHaveBeenCalled();
      expect(primera.p).toEqual([A.lon, A.lat]);
      expect(primera.getElement().textContent).toBe(
        texto(distanciaEnMetros(A, C)),
      );
    });
  });
});
