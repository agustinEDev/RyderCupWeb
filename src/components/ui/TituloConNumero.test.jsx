import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TituloConNumero from './TituloConNumero';

/**
 * El título de una sección con su número. Visto en el Kind a 360 px: con un
 * espacio que no se parte delante, el navegador aún cortaba antes de la
 * pastilla y el número caía solo a la línea siguiente. La última palabra y el
 * número van juntos en un bloque que no se parte: si no cabe, baja «rechazadas 2».
 */
describe('TituloConNumero', () => {
  it('T1: la última palabra y el número, en un bloque que no se parte', () => {
    render(<TituloConNumero texto="Solicitudes rechazadas" numero={2} />);

    const numero = screen.getByTestId('numero-de-la-seccion');
    const bloque = numero.parentElement;
    expect(bloque).toHaveClass('whitespace-nowrap');
    expect(bloque.textContent).toBe('rechazadas 2');
    expect(numero).toHaveTextContent('2');
  });

  it('T2: el resto del título va delante, libre de partirse', () => {
    const { container } = render(<TituloConNumero texto="Solicitudes rechazadas" numero={2} />);

    expect(container.textContent).toBe('Solicitudes rechazadas 2');
  });

  it('T3: un título de una sola palabra, entero junto a su número', () => {
    render(<TituloConNumero texto="Campos" numero={1} />);

    expect(screen.getByTestId('numero-de-la-seccion').parentElement.textContent).toBe('Campos 1');
  });
});
