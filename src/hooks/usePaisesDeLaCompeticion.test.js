import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * El cambio del primer adyacente (A6): el mismo país otra vez no toca nada
 * (ni el formulario ni los vecinos del tercer país); otro país sí.
 */
vi.mock('../composition', () => ({
  fetchCountriesUseCase: { execute: vi.fn(async () => []) },
  getAdjacentCountriesUseCase: { execute: vi.fn(async () => []) },
}));

const composicion = await import('../composition');
const { usePaisesDeLaCompeticion } = await import('./usePaisesDeLaCompeticion');

const FORMULARIO = {
  country: { code: 'ES' },
  adjacentCountry1: 'FR',
  adjacentCountry2: 'IT',
  showAdjacentCountry1: true,
  showAdjacentCountry2: true,
  golfCourses: [],
};

const monta = () => {
  const setFormData = vi.fn();
  const { result } = renderHook(() =>
    usePaisesDeLaCompeticion({
      idioma: 'es',
      formData: FORMULARIO,
      setFormData,
    }),
  );
  return { result, setFormData };
};

const elige = (result, valor) =>
  act(async () => {
    result.current.selectores.onCambiarAdyacente1({
      target: { value: valor },
    });
  });

describe('usePaisesDeLaCompeticion · el primer adyacente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A6: el mismo adyacente otra vez no cambia el formulario ni pide vecinos', async () => {
    const { result, setFormData } = monta();
    act(() => result.current.setAdjacentCountries2([{ code: 'IT' }]));

    await elige(result, 'FR');

    expect(setFormData).not.toHaveBeenCalled();
    expect(
      composicion.getAdjacentCountriesUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(result.current.adjacentCountries2).toEqual([{ code: 'IT' }]);
  });

  it('otro adyacente sí: cambia el formulario y pide los vecinos del nuevo', async () => {
    const { result, setFormData } = monta();
    act(() => result.current.setAdjacentCountries2([{ code: 'IT' }]));

    await elige(result, 'PT');

    expect(setFormData).toHaveBeenCalledTimes(1);
    expect(
      composicion.getAdjacentCountriesUseCase.execute,
    ).toHaveBeenCalledWith('PT');
  });
});
