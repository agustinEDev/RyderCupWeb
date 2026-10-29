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
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    alto = vi.spyOn(document.documentElement, 'scrollHeight', 'get');
  });
  afterEach(() => vi.restoreAllMocks());

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

  it('con sitio de sobra no añade nada', () => {
    alto.mockReturnValue(3000);
    filaEn(940);

    const { getByTestId } = render(<Tabla respuestas={1} />);

    expect(getByTestId('bloque').style.paddingBottom).toBe('');
  });
});
