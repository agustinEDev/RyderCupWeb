import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalesDeLaAgenda } from './useModalesDeLaAgenda';

/**
 * Cada diálogo con partido o sesión guarda solo eso: con él, abierto; `null`,
 * cerrado. La agenda lo pinta mientras lo haya.
 *
 *   diálogo    | abrir           | cerrar          | con
 *   -----------|-----------------|-----------------|---------------
 *   walkover   | abrirWalkover   | cerrarWalkover  | walkoverMatch
 *   reasignar  | abrirReasignar  | cerrarReasignar | reassignMatch
 *   detalle    | abrirDetalle    | cerrarDetalle   | detailMatchId
 *   generar    | abrirGenerar    | cerrarGenerar   | generateRound
 */
describe('useModalesDeLaAgenda', () => {
  it('empieza con todo cerrado', () => {
    const { result } = renderHook(() => useModalesDeLaAgenda());
    expect(result.current).toMatchObject({
      cubriendoCapitan: null,
      rehaciendoSobres: null,
      walkoverMatch: null,
      reassignMatch: null,
      detailMatchId: null,
      showTeamsModal: false,
      deshaciendoEquipos: false,
      generateRound: null,
    });
  });

  it.each([
    ['abrirWalkover', 'cerrarWalkover', 'walkoverMatch'],
    ['abrirReasignar', 'cerrarReasignar', 'reassignMatch'],
    ['abrirDetalle', 'cerrarDetalle', 'detailMatchId'],
    ['abrirGenerar', 'cerrarGenerar', 'generateRound'],
  ])('%s y %s', (abrir, cerrar, con) => {
    const { result } = renderHook(() => useModalesDeLaAgenda());
    const valor = { id: 'x' };

    act(() => result.current[abrir](valor));
    expect(result.current[con]).toBe(valor);

    act(() => result.current[cerrar]());
    expect(result.current[con]).toBe(null);
  });
});
