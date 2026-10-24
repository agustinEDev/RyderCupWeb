import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import NombreQueCabe from './NombreQueCabe';
import { inicialesDe } from '../../utils/inicialesDe';

/**
 * El nombre de quien ganó el hoyo, en la fila «Resultado» de la tarjeta de
 * torneo: si no cabe en la casilla, sus iniciales (Agustín, 24 oct 2026). Con
 * las columnas fijas (FE #938), a 768 px cada hoyo deja ~47 px y
 * «Maximiliano R.» ocupa ~75: se montaba sobre el hoyo de al lado.
 *
 *   #   caso                                   | esperado
 *   ----|--------------------------------------|---------------------------------------
 *   N1  cabe                                   | «Maximiliano R.»
 *   N2  no cabe                                | «MR», con el nombre en `title` y para el lector
 *   N3  la casilla se ensancha                 | vuelve el nombre
 *   N4  sin ResizeObserver (navegador viejo)   | el nombre, como antes
 *   N5  iniciales de un nombre de una palabra  | su inicial
 */
let avisar = null;
const anchos = { caja: 100, nombre: 60 };

const conMedidas = () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(fn) {
        this.fn = fn;
      }
      // Solo avisa de la casilla que se observa de verdad
      observe(elemento) {
        if (elemento.dataset.medida === 'caja') avisar = this.fn;
      }
      disconnect() {}
    }
  );
  vi.spyOn(globalThis.HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    return this.dataset.medida === 'caja' ? anchos.caja : 0;
  });
  vi.spyOn(globalThis.HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
    return this.dataset.medida === 'nombre' ? anchos.nombre : 0;
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  avisar = null;
});

describe('NombreQueCabe', () => {
  it('N1: si cabe, el nombre', () => {
    conMedidas();
    anchos.caja = 100;
    anchos.nombre = 75;

    render(<NombreQueCabe nombre="Maximiliano R." />);

    expect(screen.getByTestId('nombre-que-cabe')).toHaveTextContent(/^Maximiliano R\.$/);
  });

  it('N2: si no cabe, las iniciales, con el nombre en el title y para el lector', () => {
    conMedidas();
    anchos.caja = 47;
    anchos.nombre = 75;

    render(<NombreQueCabe nombre="Maximiliano R." />);

    const visible = screen.getByText('MR');
    expect(visible).toHaveAttribute('title', 'Maximiliano R.');
    expect(visible).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Maximiliano R.', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('N3: si la casilla se ensancha, vuelve el nombre', () => {
    conMedidas();
    anchos.caja = 47;
    anchos.nombre = 75;
    render(<NombreQueCabe nombre="Maximiliano R." />);
    expect(screen.getByText('MR')).toBeInTheDocument();

    anchos.caja = 120;
    act(() => avisar());

    expect(screen.queryByText('MR')).not.toBeInTheDocument();
    expect(screen.getByTestId('nombre-que-cabe')).toHaveTextContent(/^Maximiliano R\.$/);
  });

  it('N4: sin ResizeObserver, el nombre como antes', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    render(<NombreQueCabe nombre="Maximiliano R." />);

    expect(screen.getByTestId('nombre-que-cabe')).toHaveTextContent(/^Maximiliano R\.$/);
  });

  it('N5: las iniciales, de las dos primeras palabras', () => {
    expect(inicialesDe('Maximiliano R.')).toBe('MR');
    expect(inicialesDe('Lu')).toBe('L');
    expect(inicialesDe('ana  gil pérez')).toBe('AG');
    expect(inicialesDe('')).toBe('');
  });
});
