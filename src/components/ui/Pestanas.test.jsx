import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from './Pestanas';

/**
 * Las pestañas compartidas (FE #658): el patrón de pestañas de WAI-ARIA en una
 * sola pieza, para que ninguna pantalla vuelva a pintar botones sueltos que un
 * lector de pantalla no sabe que son pestañas.
 */
const PESTANAS = [
  { id: 'uno', contenido: 'Uno', testId: 'p-uno' },
  { id: 'dos', contenido: 'Dos', testId: 'p-dos' },
  { id: 'tres', contenido: 'Tres', testId: 'p-tres' },
];

const Prueba = ({ inicial = 'uno', onElegir, montadoSiempre = false, etiqueta = 'Vistas', listaProps = {}, enfocable }) => {
  const [actual, setActual] = useState(inicial);
  const elegir = (id) => {
    onElegir?.(id);
    setActual(id);
  };
  return (
    <GrupoDePestanas actual={actual} onElegir={elegir}>
      <ListaDePestanas
        etiqueta={etiqueta}
        pestanas={PESTANAS}
        claseDePestana={(sel) => (sel ? 'activa' : 'inactiva')}
        {...listaProps}
      />
      {PESTANAS.map((p) => (
        <PanelDePestana key={p.id} id={p.id} montadoSiempre={montadoSiempre} enfocable={enfocable}>
          <p>contenido {p.id}</p>
        </PanelDePestana>
      ))}
    </GrupoDePestanas>
  );
};

const pestana = (nombre, dentro = screen) => dentro.getByRole('tab', { name: nombre });

describe('Pestanas', () => {
  it('P1: la barra es un tablist con su nombre y cada pestaña un tab con su estado', () => {
    render(<Prueba />);

    const barra = screen.getByRole('tablist', { name: 'Vistas' });
    const tabs = within(barra).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    tabs.forEach((tab) => expect(tab).toHaveAttribute('type', 'button'));
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('P1: una sola pestaña en el orden del tabulador, la abierta', () => {
    render(<Prueba inicial="dos" />);

    expect(pestana('Uno')).toHaveAttribute('tabindex', '-1');
    expect(pestana('Dos')).toHaveAttribute('tabindex', '0');
    expect(pestana('Tres')).toHaveAttribute('tabindex', '-1');
  });

  it('P1: cada pestaña controla su panel, y el abierto se nombra con su pestaña', () => {
    render(<Prueba />);

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('contenido uno');
    expect(pestana('Uno')).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', pestana('Uno').id);
    expect(screen.getByRole('tabpanel', { name: 'Uno' })).toBe(panel);
  });

  it('P6: por defecto el panel no es una parada del tabulador (su contenido ya lo es)', () => {
    // WAI-ARIA: solo el panel sin nada enfocable dentro entra en el tabulador.
    // Con botones o campos dentro era una parada de más y un anillo alrededor
    // de todo el panel
    render(<Prueba />);

    expect(screen.getByRole('tabpanel')).not.toHaveAttribute('tabindex');
  });

  it('P6: con enfocable (una tabla, una lista que se desplaza) entra en el tabulador', () => {
    render(<Prueba enfocable />);

    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });

  it('P7: si la abierta no es ninguna de la barra, la primera queda en el tabulador', () => {
    // Sin esto ninguna tenía tabindex 0 y a la barra no se llegaba con el teclado
    render(<Prueba inicial="no-existe" />);

    expect(pestana('Uno')).toHaveAttribute('tabindex', '0');
    expect(pestana('Dos')).toHaveAttribute('tabindex', '-1');
    expect(pestana('Tres')).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('tab').every((tab) => tab.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('P1: sin montadoSiempre, solo existe el panel abierto', () => {
    render(<Prueba />);

    expect(screen.queryByText('contenido dos')).toBeNull();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('P1: con montadoSiempre, los cerrados siguen montados pero ocultos', () => {
    render(<Prueba montadoSiempre />);

    const cerrado = screen.getByText('contenido dos').closest('[role="tabpanel"]');
    expect(cerrado).toHaveAttribute('hidden');
    expect(pestana('Dos')).toHaveAttribute('aria-controls', cerrado.id);
    expect(cerrado).toHaveAttribute('aria-labelledby', pestana('Dos').id);
    expect(screen.getByText('contenido uno').closest('[role="tabpanel"]')).not.toHaveAttribute('hidden');
  });

  it('pulsar una pestaña la abre', () => {
    render(<Prueba />);

    fireEvent.click(pestana('Tres'));

    expect(pestana('Tres')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Tres' })).toHaveTextContent('contenido tres');
  });

  it('P2: la flecha derecha abre la siguiente y le lleva el foco; de la última vuelve a la primera', () => {
    render(<Prueba />);

    fireEvent.keyDown(pestana('Uno'), { key: 'ArrowRight' });
    expect(pestana('Dos')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Dos')).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('contenido dos');

    fireEvent.keyDown(pestana('Dos'), { key: 'ArrowRight' });
    fireEvent.keyDown(pestana('Tres'), { key: 'ArrowRight' });
    expect(pestana('Uno')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Uno')).toHaveFocus();
  });

  it('P2: la flecha izquierda abre la anterior; de la primera va a la última', () => {
    render(<Prueba inicial="dos" />);

    fireEvent.keyDown(pestana('Dos'), { key: 'ArrowLeft' });
    expect(pestana('Uno')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Uno')).toHaveFocus();

    fireEvent.keyDown(pestana('Uno'), { key: 'ArrowLeft' });
    expect(pestana('Tres')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Tres')).toHaveFocus();
  });

  it('P2: Inicio y Fin van a la primera y a la última', () => {
    render(<Prueba inicial="dos" />);

    fireEvent.keyDown(pestana('Dos'), { key: 'End' });
    expect(pestana('Tres')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Tres')).toHaveFocus();

    fireEvent.keyDown(pestana('Tres'), { key: 'Home' });
    expect(pestana('Uno')).toHaveAttribute('aria-selected', 'true');
    expect(pestana('Uno')).toHaveFocus();
  });

  it('P2: las teclas que no son del patrón no cambian nada ni se las come', () => {
    const onElegir = vi.fn();
    render(<Prueba onElegir={onElegir} />);

    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'a']) {
      const evento = new globalThis.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      pestana('Uno').dispatchEvent(evento);
      expect(evento.defaultPrevented).toBe(false);
    }
    expect(onElegir).not.toHaveBeenCalled();
    expect(pestana('Uno')).toHaveAttribute('aria-selected', 'true');
  });

  it('P2: con Alt, Cmd o Ctrl las flechas son del navegador o del sistema, no de la barra', () => {
    // Alt+flecha es «atrás/adelante» en el navegador, Cmd+flecha va al
    // principio o al final de la línea...: la barra no se las come
    const onElegir = vi.fn();
    render(<Prueba onElegir={onElegir} />);

    for (const modificador of ['altKey', 'metaKey', 'ctrlKey']) {
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
        const evento = new globalThis.KeyboardEvent('keydown', { key, [modificador]: true, bubbles: true, cancelable: true });
        pestana('Uno').dispatchEvent(evento);
        expect(evento.defaultPrevented).toBe(false);
      }
    }
    expect(onElegir).not.toHaveBeenCalled();
    expect(pestana('Uno')).toHaveAttribute('aria-selected', 'true');
  });

  it('P2: con Shift, las flechas siguen siendo de la barra', () => {
    render(<Prueba />);

    fireEvent.keyDown(pestana('Uno'), { key: 'ArrowRight', shiftKey: true });

    expect(pestana('Dos')).toHaveAttribute('aria-selected', 'true');
  });

  it('P2: las flechas no desplazan la página (se quedan con la tecla)', () => {
    render(<Prueba />);

    const evento = new globalThis.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    pestana('Uno').dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
  });

  it('P1: dos grupos en la misma pantalla no comparten ids', () => {
    render(
      <>
        <Prueba etiqueta="Primera" />
        <Prueba etiqueta="Segunda" />
      </>
    );

    const ids = screen.getAllByRole('tab').map((tab) => tab.id);
    const paneles = screen.getAllByRole('tabpanel').map((panel) => panel.id);
    expect(new Set([...ids, ...paneles]).size).toBe(ids.length + paneles.length);
    const segunda = screen.getByRole('tablist', { name: 'Segunda' });
    fireEvent.keyDown(within(segunda).getByRole('tab', { name: 'Uno' }), { key: 'ArrowRight' });
    expect(within(segunda).getByRole('tab', { name: 'Dos' })).toHaveFocus();
    const primera = screen.getByRole('tablist', { name: 'Primera' });
    expect(within(primera).getByRole('tab', { name: 'Uno' })).toHaveAttribute('aria-selected', 'true');
  });

  it('P3: cada pestaña lleva su data-testid y la clase según esté abierta; la barra, lo que se le pase', () => {
    render(<Prueba listaProps={{ className: 'flex barra', 'data-testid': 'mi-barra' }} />);

    expect(screen.getByTestId('p-uno')).toHaveClass('activa');
    expect(screen.getByTestId('p-dos')).toHaveClass('inactiva');
    expect(screen.getByTestId('mi-barra')).toHaveAttribute('role', 'tablist');
    expect(screen.getByTestId('mi-barra')).toHaveClass('flex', 'barra');
  });

  it('P3: el contenido de la pestaña puede llevar más que texto (un contador)', () => {
    render(
      <GrupoDePestanas actual="a" onElegir={() => {}}>
        <ListaDePestanas
          etiqueta="Listas"
          pestanas={[{ id: 'a', contenido: <>Amigos <span data-testid="contador">3</span></> }]}
          claseDePestana={() => ''}
        />
      </GrupoDePestanas>
    );

    expect(within(screen.getByRole('tab', { name: 'Amigos 3' })).getByTestId('contador')).toBeInTheDocument();
  });

  it('P5: la barra acepta una ref y un tabIndex, para devolverle el foco', () => {
    const Con = () => {
      const ref = useRef(null);
      return (
        <GrupoDePestanas actual="a" onElegir={() => {}}>
          <ListaDePestanas ref={ref} tabIndex={-1} etiqueta="Vistas" pestanas={[{ id: 'a', contenido: 'A' }]} claseDePestana={() => ''} />
          <button type="button" onClick={() => ref.current.focus()}>volver</button>
        </GrupoDePestanas>
      );
    };
    render(<Con />);

    fireEvent.click(screen.getByText('volver'));

    expect(screen.getByRole('tablist')).toHaveFocus();
  });

  it('panel único: todas las pestañas controlan el mismo panel, nombrado por la abierta', () => {
    const Unico = () => {
      const [actual, setActual] = useState('uno');
      return (
        <GrupoDePestanas actual={actual} onElegir={setActual} panelUnico>
          <ListaDePestanas etiqueta="Vistas" pestanas={PESTANAS} claseDePestana={() => ''} />
          <PanelDePestana>
            <p>lista de {actual}</p>
          </PanelDePestana>
        </GrupoDePestanas>
      );
    };
    render(<Unico />);

    const panel = screen.getByRole('tabpanel', { name: 'Uno' });
    screen.getAllByRole('tab').forEach((tab) => expect(tab).toHaveAttribute('aria-controls', panel.id));

    fireEvent.keyDown(pestana('Uno'), { key: 'End' });

    expect(screen.getByRole('tabpanel', { name: 'Tres' })).toBe(panel);
    expect(panel).toHaveTextContent('lista de tres');
  });

  it('el panel puede ser otro elemento (un formulario) y recibe lo que se le pase', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <GrupoDePestanas actual="a" onElegir={() => {}}>
        <ListaDePestanas etiqueta="Vistas" pestanas={[{ id: 'a', contenido: 'A' }]} claseDePestana={() => ''} />
        <PanelDePestana id="a" como="form" className="p-4" onSubmit={onSubmit} data-testid="panel-form">
          <button type="submit">enviar</button>
        </PanelDePestana>
      </GrupoDePestanas>
    );

    const panel = screen.getByTestId('panel-form');
    expect(panel.tagName).toBe('FORM');
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveClass('p-4');
    fireEvent.click(screen.getByText('enviar'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('sin pestañas (no se pinta la barra): el panel abierto sale como un elemento normal', () => {
    render(
      <GrupoDePestanas actual="manual" onElegir={() => {}} sinPestanas>
        <PanelDePestana id="rfeg">
          <p>rfeg</p>
        </PanelDePestana>
        <PanelDePestana id="manual" data-testid="manual">
          <p>manual</p>
        </PanelDePestana>
      </GrupoDePestanas>
    );

    expect(screen.queryByText('rfeg')).toBeNull();
    const manual = screen.getByTestId('manual');
    expect(manual).not.toHaveAttribute('role');
    expect(manual).not.toHaveAttribute('aria-labelledby');
    expect(manual).not.toHaveAttribute('tabindex');
    expect(manual).not.toHaveAttribute('id');
  });
});
