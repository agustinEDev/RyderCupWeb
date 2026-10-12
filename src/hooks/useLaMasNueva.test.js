import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLaMasNueva } from './useLaMasNueva';

/**
 * Varias lecturas de lo mismo pueden cruzarse (el sondeo y un botón): la
 * respuesta de una vieja no pisa la de otra más nueva ya aplicada, pero sí se
 * aplica mientras la nueva no ha llegado (FE #824, PR 5; CodeRabbit y
 * /code-review: con mala cobertura, cada lectura tarda más que el sondeo)
 */
describe('useLaMasNueva (FE #824)', () => {
  it('cada lectura tiene su turno, cada vez mayor', () => {
    const { result } = renderHook(() => useLaMasNueva());

    const primera = result.current.turno();
    expect(result.current.turno()).toBeGreaterThan(primera);
  });

  it('la vieja que llega después de la nueva no se aplica', () => {
    const { result } = renderHook(() => useLaMasNueva());
    const vieja = result.current.turno();
    const nueva = result.current.turno();

    expect(result.current.aplicar(nueva)).toBe(true);
    expect(result.current.aplicar(vieja)).toBe(false);
  });

  it('la vieja que llega antes se aplica, y la nueva después también', () => {
    const { result } = renderHook(() => useLaMasNueva());
    const vieja = result.current.turno();
    const nueva = result.current.turno();

    expect(result.current.aplicar(vieja)).toBe(true);
    expect(result.current.aplicar(nueva)).toBe(true);
  });

  it('si la nueva no llega nunca (falló), la vieja se aplica igual', () => {
    const { result } = renderHook(() => useLaMasNueva());
    const vieja = result.current.turno();
    result.current.turno();

    expect(result.current.aplicar(vieja)).toBe(true);
  });

  it('la misma no se aplica dos veces', () => {
    const { result } = renderHook(() => useLaMasNueva());
    const una = result.current.turno();

    expect(result.current.aplicar(una)).toBe(true);
    expect(result.current.aplicar(una)).toBe(false);
  });

  it('es la misma pieza en cada pintada (se usa en dependencias)', () => {
    const { result, rerender } = renderHook(() => useLaMasNueva());
    const antes = result.current;
    rerender();

    expect(result.current).toBe(antes);
  });
});
