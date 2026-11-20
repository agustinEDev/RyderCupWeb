import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAjustesDelBorrador } from './useAjustesDelBorrador';
import { nombrePorDefecto } from '../../utils/nombrePorDefecto';

/**
 * Los ajustes del paso 1:
 *
 *   #   caso                                               | qué pasa
 *   ----|--------------------------------------------------|---------------------------------
 *   C1  nuevo                                             | match play individual, stableford, hándicap
 *   C2  repetir con nombre propio y %                     | se copian; el % se ofrece
 *   C3  repetir con nombre por defecto                    | no se copia: se sugiere otro
 *   C4  cambiar de modalidad                              | el % vuelve al de por defecto
 *   C5  elegir a mano el % por defecto                    | no cuenta como «a mano»
 *   C6  formatos                                          | cupo, equipos y foursomes
 */
describe('useAjustesDelBorrador', () => {
  it('C1: sin copia, lo de siempre', () => {
    const { result } = renderHook(() => useAjustesDelBorrador(null));
    expect(result.current).toEqual(
      expect.objectContaining({
        mode: 'MATCH_PLAY',
        matchFormat: 'SINGLES',
        scoringFormat: 'STABLEFORD',
        playMode: 'HANDICAP',
        selectedCourse: null,
        matchName: '',
        nombreAMano: false,
        nombreSugerido: '',
        allowancePercentage: 100,
        defaultAllowance: 100,
        porcentajeCopiado: null,
        isFreePlay: false,
        capacity: 2,
      }),
    );
  });

  it('C2: al repetir se copian el nombre propio y el %', () => {
    const copia = {
      matchName: 'La revancha',
      selectedCourse: { id: 'gc-a', name: 'Campo A' },
      mode: 'FREE_PLAY',
      scoringFormat: 'MEDAL',
      allowanceOverride: 85,
      playMode: 'SCRATCH',
    };
    const { result } = renderHook(() => useAjustesDelBorrador(copia));
    expect(result.current.matchName).toBe('La revancha');
    expect(result.current.nombreAMano).toBe(true);
    expect(result.current.allowancePercentage).toBe(85);
    expect(result.current.porcentajeCopiado).toEqual({ pct: 85, libre: true });
    expect(result.current.playMode).toBe('SCRATCH');
    expect(result.current.isFreePlay).toBe(true);
    expect(result.current.capacity).toBe(4);
  });

  it('C3: un nombre por defecto no se copia: se sugiere el de hoy', () => {
    const campo = { id: 'gc-a', name: 'Campo A' };
    const copia = {
      matchName: nombrePorDefecto('Campo A', new Date('2026-01-01')),
      selectedCourse: campo,
    };
    const { result } = renderHook(() => useAjustesDelBorrador(copia));
    expect(result.current.matchName).toBe('');
    expect(result.current.nombreAMano).toBe(false);
    expect(result.current.nombreSugerido).toBe(
      nombrePorDefecto('Campo A', new Date()),
    );
    act(() => result.current.cambiaElNombre('Otra'));
    expect(result.current.matchName).toBe('Otra');
    expect(result.current.nombreAMano).toBe(true);
  });

  it('C4: cambiar de modalidad vuelve al % por defecto', () => {
    const { result } = renderHook(() => useAjustesDelBorrador(null));
    act(() => result.current.cambiaElPorcentaje(90));
    expect(result.current.allowancePercentage).toBe(90);
    act(() => result.current.handleModeChange('FREE_PLAY'));
    expect(result.current.allowancePercentage).toBe(
      result.current.defaultAllowance,
    );
  });

  it('C5: el % por defecto elegido a mano no queda como «a mano»', () => {
    const { result } = renderHook(() => useAjustesDelBorrador(null));
    act(() => result.current.cambiaElPorcentaje(100));
    act(() => result.current.setMatchFormat('FOURBALL'));
    // Sigue al de por defecto del formato nuevo, no se queda en 100
    expect(result.current.allowancePercentage).toBe(
      result.current.defaultAllowance,
    );
    expect(result.current.defaultAllowance).not.toBe(100);
  });

  it.each([
    ['SINGLES', 2, false, false],
    ['FOURBALL', 4, true, false],
    ['FOURSOMES', 4, true, true],
  ])('C6: %s cabe %i; equipos %s; foursomes %s', (formato, cupo, eq, fs) => {
    const { result } = renderHook(() => useAjustesDelBorrador(null));
    act(() => result.current.setMatchFormat(formato));
    expect(result.current.capacity).toBe(cupo);
    expect(result.current.isTeamFormat).toBe(eq);
    expect(result.current.isFoursomes).toBe(fs);
  });
});
