import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

/**
 * La barra fina de arriba mientras la pantalla siguiente espera sus datos
 * (FE #647, fase 3; decidido el 2 nov 2026).
 *
 *   #    | caso                           | esperado
 *   -----|--------------------------------|------------------------
 *   T21a | sin navegación en curso        | no hay barra
 *   T21b | navegación de menos de 150 ms  | no llega a salir
 *   T21c | pasa de 150 ms                 | sale
 *   T21d | termina                        | se va
 *   T21f | tras una espera corta, otra     | también espera sus 150 ms
 */
const navegacion = vi.hoisted(() => ({ state: 'idle' }));
vi.mock('react-router', () => ({ useNavigation: () => ({ state: navegacion.state }) }));

const { default: BarraDeCarga, ESPERA_ANTES_DE_LA_BARRA_MS } = await import('./BarraDeCarga');

describe('BarraDeCarga', () => {
  afterEach(() => {
    vi.useRealTimers();
    navegacion.state = 'idle';
  });

  it('T21a: sin navegación, no hay barra', () => {
    render(<BarraDeCarga />);
    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });

  it('T21b: antes de 150 ms no sale', () => {
    vi.useFakeTimers();
    navegacion.state = 'loading';
    render(<BarraDeCarga />);

    act(() => vi.advanceTimersByTime(ESPERA_ANTES_DE_LA_BARRA_MS - 1));

    expect(ESPERA_ANTES_DE_LA_BARRA_MS).toBe(150);
    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });

  it('T21c: a los 150 ms sale, y se anuncia como progreso', () => {
    vi.useFakeTimers();
    navegacion.state = 'loading';
    render(<BarraDeCarga />);

    act(() => vi.advanceTimersByTime(ESPERA_ANTES_DE_LA_BARRA_MS));

    expect(screen.getByTestId('barra-de-carga')).toHaveAttribute('role', 'progressbar');
  });

  it('T21d: al terminar, se va', () => {
    vi.useFakeTimers();
    navegacion.state = 'loading';
    const { rerender } = render(<BarraDeCarga />);
    act(() => vi.advanceTimersByTime(ESPERA_ANTES_DE_LA_BARRA_MS));

    navegacion.state = 'idle';
    rerender(<BarraDeCarga />);

    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });

  it('T21e: una espera corta que acaba no deja un reloj que la saque después', () => {
    vi.useFakeTimers();
    navegacion.state = 'loading';
    const { rerender } = render(<BarraDeCarga />);
    act(() => vi.advanceTimersByTime(100));

    navegacion.state = 'idle';
    rerender(<BarraDeCarga />);
    act(() => vi.advanceTimersByTime(500));

    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });

  it('T21f: tras una espera corta, la siguiente también espera sus 150 ms', () => {
    vi.useFakeTimers();
    navegacion.state = 'loading';
    const { rerender } = render(<BarraDeCarga />);
    act(() => vi.advanceTimersByTime(100));
    navegacion.state = 'idle';
    rerender(<BarraDeCarga />);
    act(() => vi.advanceTimersByTime(500));

    navegacion.state = 'loading';
    rerender(<BarraDeCarga />);

    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });
});
