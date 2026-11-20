import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalesDeLaAgenda } from './useModalesDeLaAgenda';

/**
 * Cada diálogo con partido o sesión se abre con los dos a la vez y se cierra
 * soltando los dos: la agenda solo lo pinta con ambos.
 *
 *   diálogo    | abrir           | abierto          | con
 *   -----------|-----------------|------------------|---------------
 *   walkover   | abrirWalkover   | showWalkoverModal | walkoverMatch
 *   reasignar  | abrirReasignar  | showReassignModal | reassignMatch
 *   detalle    | abrirDetalle    | showMatchDetail…  | detailMatchId
 *   generar    | abrirGenerar    | showGenerateModal | generateRound
 */
describe('useModalesDeLaAgenda', () => {
  it('empieza con todo cerrado', () => {
    const { result } = renderHook(() => useModalesDeLaAgenda());
    expect(result.current).toMatchObject({
      cubriendoCapitan: null,
      rehaciendoSobres: null,
      showWalkoverModal: false,
      walkoverMatch: null,
      showReassignModal: false,
      reassignMatch: null,
      showMatchDetailModal: false,
      detailMatchId: null,
      showTeamsModal: false,
      deshaciendoEquipos: false,
      showGenerateModal: false,
      generateRound: null,
    });
  });

  it.each([
    ['abrirWalkover', 'cerrarWalkover', 'showWalkoverModal', 'walkoverMatch'],
    ['abrirReasignar', 'cerrarReasignar', 'showReassignModal', 'reassignMatch'],
    ['abrirDetalle', 'cerrarDetalle', 'showMatchDetailModal', 'detailMatchId'],
    ['abrirGenerar', 'cerrarGenerar', 'showGenerateModal', 'generateRound'],
  ])('%s y %s', (abrir, cerrar, abierto, con) => {
    const { result } = renderHook(() => useModalesDeLaAgenda());
    const valor = { id: 'x' };

    act(() => result.current[abrir](valor));
    expect(result.current[abierto]).toBe(true);
    expect(result.current[con]).toBe(valor);

    act(() => result.current[cerrar]());
    expect(result.current[abierto]).toBe(false);
    expect(result.current[con]).toBe(null);
  });
});
