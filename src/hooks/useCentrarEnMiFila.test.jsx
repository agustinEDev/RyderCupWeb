import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useCentrarEnMiFila } from './useCentrarEnMiFila';

/**
 * FE #988: la fila «tu posición» del scratch, al final de la página, no se
 * centraba: la página no podía bajar más. Se añade debajo el espacio que falta.
 */
const Tabla = ({ respuestas }) => {
  const ref = useCentrarEnMiFila({ modo: 'una', activa: true, respuestas });
  return (
    <div ref={ref} data-testid="bloque">
      <table>
        <tbody>
          <tr data-yo="true" tabIndex={-1}>
            <td>yo</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

describe('useCentrarEnMiFila · la última fila también se centra (FE #988)', () => {
  let alto;
  let desplazar;
  const original = window.HTMLElement.prototype.scrollIntoView;
  beforeEach(() => {
    desplazar = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = desplazar;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    alto = vi.spyOn(document.documentElement, 'scrollHeight', 'get');
  });
  afterEach(() => {
    document.documentElement.style.removeProperty('--alto-barra-inferior');
    vi.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = original;
  });

  const filaEn = (top) =>
    vi
      .spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top, height: 40, bottom: top + 40 });

  it('al final de la página añade el espacio que falta para centrarla', () => {
    // Página de 1000: puede bajar 200. La fila (centro en 960) necesita bajar 560
    alto.mockReturnValue(1000);
    filaEn(940);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('360px');
  });

  it('el espacio ya está puesto cuando se desplaza', () => {
    alto.mockReturnValue(1000);
    filaEn(940);
    let alDesplazar = null;
    desplazar.mockImplementation(function () {
      alDesplazar = this.closest('[data-testid="bloque"]').style.paddingBottom;
    });

    render(<Tabla respuestas={1} />);

    expect(alDesplazar).toBe('360px');
  });

  it('con la página ya bajada cuenta lo bajado', () => {
    // Bajada 100: la fila está en 1040 de la página; puede bajar hasta 200
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100);
    alto.mockReturnValue(1000);
    filaEn(940);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('460px');
  });

  it('si la fila ya se ve entera no añade nada (revisor)', () => {
    alto.mockReturnValue(1000);
    filaEn(600);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('');
  });

  it('la barra inferior tapa: debajo de ella no cuenta como visible (code-review)', () => {
    // Pantalla de 800 con la barra de 80: se ve hasta 720. La fila acaba en 760
    document.documentElement.style.setProperty('--alto-barra-inferior', '80px');
    alto.mockReturnValue(800);
    filaEn(720);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    // El centro de lo visible está en 360; la fila (740) tiene que subir 380
    expect(getByTestId('bloque').style.paddingBottom).toBe('380px');
  });

  it('con sitio de sobra no añade nada', () => {
    alto.mockReturnValue(3000);
    filaEn(940);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('');
  });
});
