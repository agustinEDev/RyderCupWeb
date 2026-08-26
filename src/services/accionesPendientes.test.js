import { describe, it, expect, beforeEach } from 'vitest';
import {
  loQueSeEnseñoAntes,
  recuerdaLasAccionesPendientes,
  olvidaLasAccionesPendientes,
} from './accionesPendientes';

/**
 * Lo último que enseñó «Requiere tu Atención» (FE #502). El panel se remonta en
 * cada vuelta a Inicio desde la barra inferior, así que sin esto cada vuelta
 * empezaba de cero y pintaba su esqueleto amarillo.
 */
describe('la memoria de las acciones pendientes', () => {
  beforeEach(() => {
    olvidaLasAccionesPendientes();
  });

  it('al principio no hay nada que enseñar', () => {
    expect(loQueSeEnseñoAntes()).toBeNull();
  });

  it('devuelve lo último que se enseñó', () => {
    recuerdaLasAccionesPendientes({ pendingInvitations: 2, activeQuickMatches: [{ id: 'q1' }] });

    expect(loQueSeEnseñoAntes()).toEqual({ pendingInvitations: 2, activeQuickMatches: [{ id: 'q1' }] });
  });

  it('al cerrar sesión se olvida', () => {
    // Son datos de ESA cuenta: asomarian un instante en la siguiente que entrara
    // sin recargar la pagina
    recuerdaLasAccionesPendientes({ pendingInvitations: 2 });

    olvidaLasAccionesPendientes();

    expect(loQueSeEnseñoAntes()).toBeNull();
  });
});
