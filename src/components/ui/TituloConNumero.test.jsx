import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TituloConNumero from './TituloConNumero';

/**
 * El título de una sección con su número. A 360 px el número se quedaba solo en
 * la línea siguiente. Decidido por Agustín en la ronda 2: el texto a la
 * izquierda, que se parte si no cabe, y el número en su pastilla al borde
 * derecho, centrado en altura, igual en todas las secciones.
 */
const enFila = (ui) => render(<h3 className="flex items-center gap-2">{ui}</h3>);

describe('TituloConNumero', () => {
  it('T1: el texto ocupa lo que sobra y puede partirse', () => {
    enFila(<TituloConNumero texto="Solicitudes rechazadas" numero={2} />);

    const texto = screen.getByText('Solicitudes rechazadas');
    expect(texto).toHaveClass('flex-1', 'min-w-0');
  });

  it('T2: el número va aparte, al borde derecho, sin encogerse', () => {
    enFila(<TituloConNumero texto="Solicitudes rechazadas" numero={2} />);

    const numero = screen.getByTestId('numero-de-la-seccion');
    expect(numero).toHaveTextContent('2');
    expect(numero).toHaveClass('flex-none');
    // Hermano del texto, no dentro de él: así se alinea a la derecha
    expect(screen.getByText('Solicitudes rechazadas')).not.toContainElement(numero);
    expect(numero.previousElementSibling).toBe(screen.getByText('Solicitudes rechazadas'));
  });
});
