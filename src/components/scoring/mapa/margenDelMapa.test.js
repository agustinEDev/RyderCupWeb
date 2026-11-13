import { describe, it, expect } from 'vitest';
import { margenDelEncuadre, margenMedido } from './margenDelMapa';

// Un elemento con su caja en pantalla (y su alto, para el contenedor)
const caja = (top, bottom, alto) => ({
  clientHeight: alto,
  getBoundingClientRect: () => ({ top, bottom, height: bottom - top }),
});

describe('margenDelMapa', () => {
  describe('margenDelEncuadre', () => {
    it('dada una pantalla alta, cuando se calcula, entonces arriba 90 y abajo 320 como mucho', () => {
      expect(margenDelEncuadre(1000)).toEqual({
        top: 90,
        bottom: 320,
        left: 40,
        right: 40,
      });
    });

    it('dada una pantalla en apaisado, cuando se calcula, entonces un 15 % arriba y un 45 % abajo, redondeados', () => {
      expect(margenDelEncuadre(361)).toEqual({
        top: 54,
        bottom: 162,
        left: 40,
        right: 40,
      });
      // 55,5 y 166,5: redondeados hacia arriba
      expect(margenDelEncuadre(370)).toEqual({
        top: 56,
        bottom: 167,
        left: 40,
        right: 40,
      });
    });
  });

  describe('margenMedido', () => {
    it('dadas la cabecera y el panel ya pintados, cuando se mide, entonces lo que tapan con 12 px de aire', () => {
      const contenedor = caja(0, 800, 800);

      expect(margenMedido(contenedor, caja(0, 60), caja(600, 800))).toEqual({
        top: 72,
        bottom: 212,
        left: 40,
        right: 40,
      });
    });

    it('dado un contenedor que no empieza arriba, cuando se mide, entonces cuenta desde su caja', () => {
      const contenedor = caja(100, 900, 800);

      expect(margenMedido(contenedor, caja(100, 160), caja(700, 900))).toEqual({
        top: 72,
        bottom: 212,
        left: 40,
        right: 40,
      });
    });

    it('dado que no caben 120 px de hoyo, cuando se mide, entonces los de siempre según el alto', () => {
      const contenedor = caja(0, 360, 360);

      expect(margenMedido(contenedor, caja(0, 100), caja(150, 360))).toEqual(
        margenDelEncuadre(360),
      );
    });

    it('dado que justo caben 120 px, cuando se mide, entonces lo medido', () => {
      // Arriba 60 + 12 = 72; abajo 800 - 204 + 12 = 608; queda 800 - 72 - 608 = 120
      const contenedor = caja(0, 800, 800);

      expect(margenMedido(contenedor, caja(0, 60), caja(204, 800))).toEqual({
        top: 72,
        bottom: 608,
        left: 40,
        right: 40,
      });
    });

    it.each([
      ['sin contenedor', null, caja(0, 60), caja(600, 800), 640],
      ['sin cabecera', caja(0, 800, 800), null, caja(600, 800), 800],
      ['sin panel', caja(0, 800, 800), caja(0, 60), undefined, 800],
      [
        'con la cabecera aún sin alto',
        caja(0, 800, 800),
        caja(0, 0),
        caja(600, 800),
        800,
      ],
      [
        'con el panel aún sin alto',
        caja(0, 800, 800),
        caja(0, 60),
        caja(800, 800),
        800,
      ],
      [
        'con el contenedor aún sin alto',
        caja(0, 0, 0),
        caja(0, 60),
        caja(600, 800),
        640,
      ],
      ['con elementos sin caja', { clientHeight: 700 }, {}, {}, 700],
    ])(
      'dado un caso %s, cuando se mide, entonces los de siempre según el alto',
      (_, contenedor, arriba, abajo, alto) => {
        expect(margenMedido(contenedor, arriba, abajo)).toEqual(
          margenDelEncuadre(alto),
        );
      },
    );
  });
});
