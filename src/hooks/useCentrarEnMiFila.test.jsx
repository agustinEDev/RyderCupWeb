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
    document.querySelectorAll('[data-tapa-abajo]').forEach((hueco) => hueco.remove());
    vi.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = original;
  });

  // La fila, y lo que tapa por abajo (los huecos de App, con `data-tapa-abajo`)
  const filaEn = (top, tapa = 0) =>
    vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.hasAttribute('data-tapa-abajo')) return { top: 800 - tapa, height: tapa, bottom: 800 };
      return { top, height: 40, bottom: top + 40 };
    });
  const huecoDeLaBarra = () => {
    const hueco = document.createElement('div');
    hueco.setAttribute('data-tapa-abajo', '');
    document.body.appendChild(hueco);
  };

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
    // Pantalla de 800 con la barra de 80 (medida en su hueco: su variable es un
    // calc() que no se puede leer, CodeRabbit): se ve hasta 720. La fila acaba en 760
    huecoDeLaBarra();
    alto.mockReturnValue(800);
    filaEn(720, 80);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    // El centro de lo visible está en 360; la fila (740) tiene que subir 380
    expect(getByTestId('bloque').style.paddingBottom).toBe('380px');
  });

  it('se centra en lo visible: lo tapado, como scroll-padding solo mientras se desplaza (CodeRabbit)', () => {
    huecoDeLaBarra();
    alto.mockReturnValue(800);
    filaEn(720, 80);
    let alDesplazar = null;
    desplazar.mockImplementation(() => {
      alDesplazar = document.documentElement.style.scrollPaddingBottom;
    });

    render(<Tabla respuestas={1} />);

    expect(alDesplazar).toBe('80px');
    expect(document.documentElement.style.scrollPaddingBottom).toBe('');
  });

  it('con sitio de sobra no añade nada', () => {
    alto.mockReturnValue(3000);
    filaEn(940);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('');
  });
});
