import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalShell from './ModalShell';

const abrir = (props = {}) =>
  render(
    <ModalShell isOpen onClose={props.onClose ?? vi.fn()} testId="modal" labelledBy="t" describedBy="d" {...props}>
      <h2 id="t">Título</h2>
      <p id="d">Explicación</p>
      <button>Primero</button>
      <button>Último</button>
    </ModalShell>
  );

// Cerrar por el fondo es un gesto completo: pulsar y soltar ahí. `fireEvent.click`
// por su cuenta no manda el `mousedown`, que es justo lo que distingue un toque
// en el fondo de un arrastre que empezó dentro de la caja.
const pulsarElFondo = (fondo) => {
  fireEvent.mouseDown(fondo);
  fireEvent.click(fondo);
};

describe('ModalShell', () => {
  it('no pinta nada mientras está cerrado', () => {
    render(
      <ModalShell isOpen={false} onClose={vi.fn()} testId="modal">
        <button>Dentro</button>
      </ModalShell>
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('se anuncia como diálogo, con su título y su explicación', () => {
    abrir();

    const dialogo = screen.getByTestId('modal');
    expect(dialogo).toHaveAttribute('role', 'dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAttribute('aria-labelledby', 't');
    expect(dialogo).toHaveAttribute('aria-describedby', 'd');
  });

  it('cierra con Escape', () => {
    const onClose = vi.fn();
    abrir({ onClose });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar el fondo, pero no al pulsar dentro de la caja', () => {
    const onClose = vi.fn();
    abrir({ onClose });

    fireEvent.mouseDown(screen.getByText('Título'));
    fireEvent.click(screen.getByText('Título'));
    expect(onClose).not.toHaveBeenCalled();

    pulsarElFondo(screen.getByTestId('modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Una entrega en vuelo no se interrumpe por detrás: los botones ya están
   * desactivados y cerrar la caja dejaría al jugador sin saber si su tarjeta
   * salió. El diálogo sigue anunciándose igual.
   */
  it('sin Escape ni fondo, no cierra por ninguna de las dos vías', () => {
    const onClose = vi.fn();
    abrir({ onClose, closeOnEscape: false, closeOnBackdrop: false });

    fireEvent.keyDown(document, { key: 'Escape' });
    pulsarElFondo(screen.getByTestId('modal'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toHaveAttribute('aria-modal', 'true');
  });

  /**
   * Las dos salidas se gobiernan por separado: un diálogo con algo escrito
   * dentro no puede perderlo por un toque al lado, pero Escape sigue siendo una
   * salida deliberada.
   */
  it('puede cerrar con Escape y no con el fondo', () => {
    const onClose = vi.fn();
    abrir({ onClose, closeOnBackdrop: false });

    pulsarElFondo(screen.getByTestId('modal'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('se anuncia ocupado mientras algo está en vuelo, y no antes', () => {
    const { unmount } = abrir();
    expect(screen.getByTestId('modal')).not.toHaveAttribute('aria-busy');
    unmount();

    abrir({ busy: true });
    expect(screen.getByTestId('modal')).toHaveAttribute('aria-busy', 'true');
  });

  it('mete el foco en el primer elemento de la caja', () => {
    abrir();

    expect(document.activeElement).toBe(screen.getByText('Primero'));
  });

  it('devuelve el foco a donde estaba al cerrarse', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const { unmount } = abrir();
    expect(document.activeElement).not.toBe(disparador);

    unmount();

    expect(document.activeElement).toBe(disparador);
    disparador.remove();
  });

  it('el tabulador da la vuelta dentro de la caja', () => {
    abrir();
    const primero = screen.getByText('Primero');
    const ultimo = screen.getByText('Último');

    ultimo.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(primero);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('bloquea el arrastre de la página de debajo y lo restaura al cerrar', () => {
    const { unmount } = abrir();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  /**
   * Seleccionar el texto del mensaje con el ratón termina a menudo soltando
   * fuera de la caja. Ese soltar llegaba como un clic en el fondo y cerraba el
   * diálogo: en el aviso de final anticipado, eso descarta para toda la visita
   * el único aviso que lleva a entregar la tarjeta.
   */
  it('no cierra si el gesto empezó dentro de la caja y acabó en el fondo', () => {
    const onClose = vi.fn();
    abrir({ onClose });

    fireEvent.mouseDown(screen.getByText('Explicación'));
    fireEvent.click(screen.getByTestId('modal'));

    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * Es exactamente lo que pasa mientras la tarjeta va de camino: los dos
   * botones desactivados y nada enfocable dentro. Ahí el jugador no puede
   * acabar tabulando por la página de detrás.
   */
  it('retiene el tabulador aunque no haya nada enfocable dentro', () => {
    const fuera = document.createElement('button');
    document.body.appendChild(fuera);

    render(
      <ModalShell isOpen onClose={vi.fn()} testId="ocupado" closeOnEscape={false} closeOnBackdrop={false} busy>
        <p>Enviando</p>
        <button disabled>Cancelar</button>
        <button disabled>Enviar</button>
      </ModalShell>
    );

    const caja = screen.getByTestId('ocupado').firstChild;
    expect(document.activeElement).toBe(caja);

    // Se comprueba que el tabulador queda CANCELADO, no dónde acaba el foco:
    // jsdom no mueve el foco con Tab, así que mirar `activeElement` daba por
    // bueno el caso aunque el evento siguiera adelante y el navegador de verdad
    // se llevara el foco a la página de detrás.
    const sigueAdelante = fireEvent.keyDown(document, { key: 'Tab' });

    expect(sigueAdelante).toBe(false);
    expect(document.activeElement).toBe(caja);
    expect(document.activeElement).not.toBe(fuera);
    fuera.remove();
  });

  /**
   * En la pantalla de anotación la consulta cada 10 s puede montar un diálogo
   * encima de otro. Con el bloqueo guardado por diálogo, el segundo copiaba un
   * `hidden` que ya no era del fondo y al cerrarse el último lo devolvía: la
   * página se quedaba sin poder desplazarse y sin nada delante.
   */
  it('devuelve el desplazamiento aunque dos diálogos se solapen', () => {
    const primero = render(
      <ModalShell isOpen onClose={vi.fn()} testId="uno"><button>A</button></ModalShell>
    );
    const segundo = render(
      <ModalShell isOpen onClose={vi.fn()} testId="dos"><button>B</button></ModalShell>
    );
    expect(document.body.style.overflow).toBe('hidden');

    primero.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    segundo.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  /**
   * Con dos diálogos encima, al cerrarse el de abajo devolvía el foco a la
   * página y se lo robaba al que quedaba abierto delante.
   */
  it('no le roba el foco al diálogo que queda abierto', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const abajo = render(
      <ModalShell isOpen onClose={vi.fn()} testId="abajo"><button>Abajo</button></ModalShell>
    );
    render(
      <ModalShell isOpen onClose={vi.fn()} testId="arriba"><button>Arriba</button></ModalShell>
    );
    expect(document.activeElement).toBe(screen.getByText('Arriba'));

    abajo.unmount();

    expect(document.activeElement).toBe(screen.getByText('Arriba'));
    expect(document.activeElement).not.toBe(disparador);
    disparador.remove();
  });
});
