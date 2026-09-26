import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CarruselDeTarjetas from './CarruselDeTarjetas';

/**
 * FE #739 · en el móvil, una tarjeta por participante que se pasa deslizando.
 * Lo que se desliza es la tarjeta entera, que encaja en su sitio: la página no
 * se desplaza de lado. Arriba, los nombres para saltar a una; abajo, los puntos
 * que dicen en cuál estás.
 */
const TARJETAS = [
  { clave: 'nacho', nombre: 'Nacho', equipo: 'A', contenido: <p>tarjeta de Nacho</p> },
  { clave: 'luna', nombre: 'Luna', equipo: 'B', contenido: <p>tarjeta de Luna</p> },
  { clave: 'oscar', nombre: 'Óscar', equipo: 'B', contenido: <p>tarjeta de Óscar</p> },
];

// jsdom no maqueta: el ancho de cada tarjeta se fija a mano
const conAncho = (ancho = 320) => {
  const carril = screen.getByTestId('carril-de-tarjetas');
  Object.defineProperty(carril, 'clientWidth', { configurable: true, value: ancho });
  carril.scrollTo = vi.fn();
  return carril;
};

const marcado = () =>
  screen.getAllByRole('tab').findIndex((b) => b.getAttribute('aria-selected') === 'true');

describe('CarruselDeTarjetas', () => {
  it('K1: un nombre y una tarjeta por participante, la primera marcada', () => {
    render(<CarruselDeTarjetas tarjetas={TARJETAS} />);

    expect(screen.getAllByRole('tab').map((b) => b.textContent)).toEqual(['Nacho', 'Luna', 'Óscar']);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(3);
    expect(screen.getByText('tarjeta de Luna')).toBeInTheDocument();
    expect(marcado()).toBe(0);
  });

  it('K2: tocar un nombre lo marca y desliza hasta su tarjeta', () => {
    render(<CarruselDeTarjetas tarjetas={TARJETAS} />);
    const carril = conAncho(320);

    fireEvent.click(screen.getByRole('tab', { name: 'Óscar' }));

    expect(marcado()).toBe(2);
    expect(carril.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 640 }));
  });

  it('K3: deslizar con el dedo marca la tarjeta a la que se llega, con su punto', () => {
    render(<CarruselDeTarjetas tarjetas={TARJETAS} />);
    const carril = conAncho(320);

    carril.scrollLeft = 320;
    fireEvent.scroll(carril);

    expect(marcado()).toBe(1);
    const puntos = screen.getAllByTestId(/^punto-/);
    expect(puntos.map((p) => p.dataset.activo)).toEqual(['false', 'true', 'false']);
  });

  it('K4: con las flechas del teclado se pasa a la siguiente y a la anterior', () => {
    render(<CarruselDeTarjetas tarjetas={TARJETAS} />);
    const carril = conAncho(320);

    fireEvent.keyDown(carril, { key: 'ArrowRight' });
    expect(marcado()).toBe(1);
    fireEvent.keyDown(carril, { key: 'ArrowRight' });
    fireEvent.keyDown(carril, { key: 'ArrowRight' });
    expect(marcado()).toBe(2);
    fireEvent.keyDown(carril, { key: 'ArrowLeft' });
    expect(marcado()).toBe(1);
  });

  it('K5: con una sola tarjeta no hay nombres ni puntos que elegir', () => {
    render(<CarruselDeTarjetas tarjetas={[TARJETAS[0]]} />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryAllByTestId(/^punto-/)).toHaveLength(0);
    expect(screen.getByText('tarjeta de Nacho')).toBeInTheDocument();
  });

  it('K6: arranca en la tarjeta que se le pida (la de quien mira)', () => {
    render(<CarruselDeTarjetas tarjetas={TARJETAS} inicial="luna" />);

    expect(marcado()).toBe(1);
  });
});
