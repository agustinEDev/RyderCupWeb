import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import toast, { Toaster } from 'react-hot-toast';
import customToast from './toast';

/**
 * Un toast cerrado se va en el acto (pasada del Kind, 1 nov 2026): la librería
 * lo retira 1 s después de cerrarlo y, sin ocultarse, seguía a la vista.
 *
 * | #  | Caso                                         | Queda                               |
 * |----|----------------------------------------------|-------------------------------------|
 * | K1 | Cerrado con su X                             | Oculto en el acto                   |
 * | K2 | Cerrado por código (al salir de la agenda)   | Oculto en el acto                   |
 * | K3 | Abierto                                      | A la vista, como siempre            |
 * | K4 | Oculto                                       | No se puede pulsar                  |
 * | K5 | Se cierra uno                                | Los demás, igual                    |
 */
const caja = (texto) => screen.getByText(texto).closest('[data-toast]');
const oculto = (el) => {
  expect(el).toHaveClass('opacity-0', 'pointer-events-none');
  expect(el).toHaveAttribute('aria-hidden', 'true');
};
const aLaVista = (el) => {
  expect(el).toHaveClass('opacity-100');
  expect(el).not.toHaveClass('opacity-0', 'pointer-events-none');
  expect(el).not.toHaveAttribute('aria-hidden');
};

describe('customToast · al cerrarlo se va en el acto', () => {
  // El `Toaster` pregunta por el movimiento reducido, y jsdom no trae matchMedia
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => {
    act(() => toast.remove());
    vi.unstubAllGlobals();
  });

  it('K3: abierto, a la vista', () => {
    render(<Toaster />);
    act(() => customToast.error('No se han podido cargar los inscritos'));

    aLaVista(caja('No se han podido cargar los inscritos'));
  });

  it('K1/K4/K5: con su X se oculta y deja de pulsarse; el otro sigue', () => {
    render(<Toaster />);
    act(() => {
      customToast.error('No se han podido cargar los inscritos');
      customToast.success('Equipos deshechos');
    });

    fireEvent.click(
      caja('No se han podido cargar los inscritos').querySelector('button[aria-label]')
    );

    oculto(caja('No se han podido cargar los inscritos'));
    aLaVista(caja('Equipos deshechos'));
  });

  it.each(['success', 'error', 'warning', 'info'])('K2: cerrado por código, igual (%s)', (tipo) => {
    render(<Toaster />);
    act(() => customToast[tipo]('Aviso', { id: 'aviso' }));

    act(() => customToast.dismiss('aviso'));

    oculto(caja('Aviso'));
  });
});
