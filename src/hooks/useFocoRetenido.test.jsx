import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocoRetenido } from './useFocoRetenido';

/**
 * El foco de los diálogos (RyderCupWeb#389), lo que no cubren las hojas:
 *
 *   #   caso                                            | se espera
 *   ----|-----------------------------------------------|------------------------------
 *   H1  lo primero de la caja tiene tabindex -1         | el foco entra en lo siguiente
 *       (una pestaña cerrada)                           |
 *   H2  el tabulador da la vuelta                       | sin pasar por los tabindex -1
 *   H3  al abrir y al cerrar                            | sin desplazar la página
 *                                                       | (preventScroll)
 *   H4  con `inicialRef`                                | el foco entra en ese
 *   H5  un diálogo dentro de otro, montados a la vez    | manda el de dentro: el foco
 *                                                       | y Escape son suyos
 */

const Dialogo = ({ alEscape, inicial = false, children }) => {
  const caja = useRef(null);
  const campo = useRef(null);
  useFocoRetenido(caja, { alEscape, inicialRef: inicial ? campo : undefined });
  return (
    <div ref={caja} role="dialog" aria-modal="true" tabIndex={-1}>
      {children}
      {inicial && <input ref={campo} aria-label="campo" />}
    </div>
  );
};

const ConDisparador = ({ children }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        abrir
      </button>
      {abierto && (
        <Dialogo alEscape={() => setAbierto(false)}>
          {children}
          <button type="button" onClick={() => setAbierto(false)}>
            cerrar
          </button>
        </Dialogo>
      )}
    </>
  );
};

const PESTANAS = (
  <>
    <button type="button" role="tab" tabIndex={-1}>
      cerrada
    </button>
    <button type="button" role="tab" tabIndex={0}>
      abierta
    </button>
    <a href="#x" tabIndex={-1}>
      enlace fuera
    </a>
    <input aria-label="fuera" tabIndex={-1} />
  </>
);

afterEach(() => vi.restoreAllMocks());

describe('useFocoRetenido', () => {
  it('H1: lo que tiene tabindex -1 no recibe el foco al abrir', () => {
    render(<ConDisparador>{PESTANAS}</ConDisparador>);
    fireEvent.click(screen.getByText('abrir'));

    expect(screen.getByText('abierta')).toHaveFocus();
  });

  it('H2: el tabulador da la vuelta sin pasar por los tabindex -1', () => {
    // Los sacados del tabulador, al final: si contaran, serían «el último»
    render(
      <Dialogo>
        <button type="button">primero</button>
        <button type="button">ultimo</button>
        <button type="button" tabIndex={-1}>boton fuera</button>
        <a href="#x" tabIndex={-1}>
          enlace fuera
        </a>
        <input aria-label="campo fuera" tabIndex={-1} />
        <select aria-label="lista fuera" tabIndex={-1} />
        <textarea aria-label="texto fuera" tabIndex={-1} />
      </Dialogo>
    );
    const primero = screen.getByText('primero');
    const ultimo = screen.getByText('ultimo');

    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(primero).toHaveFocus();

    fireEvent.keyDown(primero, { key: 'Tab', shiftKey: true });
    expect(ultimo).toHaveFocus();
  });

  it('H3: al abrir y al cerrar mueve el foco sin desplazar la página', () => {
    render(<ConDisparador>{PESTANAS}</ConDisparador>);
    const disparador = screen.getByText('abrir');
    disparador.focus();
    const enfocar = vi.spyOn(globalThis.HTMLElement.prototype, 'focus');

    fireEvent.click(disparador);
    expect(screen.getByText('abierta')).toHaveFocus();
    expect(enfocar).toHaveBeenLastCalledWith({ preventScroll: true });

    fireEvent.click(screen.getByText('cerrar'));
    expect(disparador).toHaveFocus();
    expect(enfocar).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it('H4: con inicialRef el foco entra en ese y no en lo primero', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const { unmount } = render(
      <Dialogo inicial>
        <button type="button">primero</button>
      </Dialogo>
    );
    expect(screen.getByLabelText('campo')).toHaveFocus();

    unmount();
    expect(disparador).toHaveFocus();
    disparador.remove();
  });

  it('H5: un diálogo dentro de otro, montados a la vez: manda el de dentro', () => {
    const escapeFuera = vi.fn();
    const escapeDentro = vi.fn();
    render(
      <Dialogo alEscape={escapeFuera}>
        <button type="button">del de fuera</button>
        <Dialogo alEscape={escapeDentro}>
          <button type="button">del de dentro</button>
        </Dialogo>
      </Dialogo>
    );

    expect(screen.getByText('del de dentro')).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(escapeDentro).toHaveBeenCalledTimes(1);
    expect(escapeFuera).not.toHaveBeenCalled();
  });
});
