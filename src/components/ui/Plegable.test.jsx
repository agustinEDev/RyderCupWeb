import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Plegable from './Plegable';

/**
 * Una sección de la ficha que se pliega (14 oct 2026): con el torneo en juego
 * o acabado salen plegadas. Si sale plegada o no se decide al pintarse; luego
 * manda quien la abre o la cierra (/code-review).
 */
describe('Plegable', () => {
  const pinta = (abierta) => (
    <Plegable titulo="Jugadores" abiertoAlPrincipio={abierta}>
      <p>contenido</p>
    </Plegable>
  );

  it('sale como se pide al pintarse, con su título en un encabezado dentro del resumen', () => {
    render(pinta(false));

    const plegable = screen.getByText('contenido').closest('details');
    expect(plegable.open).toBe(false);
    expect(screen.getByRole('heading', { name: 'Jugadores' }).closest('summary')).not.toBeNull();
  });

  it('F8: si luego cambia lo pedido (empieza el torneo con la ficha abierta), no se cierra lo que estaba abierto', () => {
    const { rerender } = render(pinta(true));
    const plegable = screen.getByText('contenido').closest('details');

    rerender(pinta(false));

    expect(plegable.open).toBe(true);
  });

  it('F8b: lo que abre quien mira se queda abierto aunque la ficha se vuelva a pintar', () => {
    const { rerender } = render(pinta(false));
    const plegable = screen.getByText('contenido').closest('details');

    plegable.open = true;
    fireEvent(plegable, new globalThis.Event('toggle'));
    rerender(pinta(false));

    expect(plegable.open).toBe(true);
  });
});
