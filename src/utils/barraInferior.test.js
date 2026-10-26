import { describe, it, expect } from 'vitest';
import { ALTO_BARRA_INFERIOR, PANTALLA_MENOS_BARRA_INFERIOR } from './barraInferior';

/**
 * El hueco publicado y el del final de la página tienen que medir lo mismo, o
 * las pantallas de alto completo (404, sin permiso) hacen scroll (revisor).
 */
describe('barraInferior', () => {
  it('B1: el alto publicado cuenta el botón «Partida», como el hueco del final', () => {
    expect(ALTO_BARRA_INFERIOR).toBe('calc(5rem + env(safe-area-inset-bottom))');
  });

  it('B2: las pantallas de alto completo descuentan también el aviso de instalar', () => {
    expect(PANTALLA_MENOS_BARRA_INFERIOR).toContain('var(--alto-aviso-instalar,0px)');
    expect(PANTALLA_MENOS_BARRA_INFERIOR).toContain('var(--alto-barra-inferior,0px)');
  });
});
