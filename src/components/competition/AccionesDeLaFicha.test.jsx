import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccionesDeLaFicha from './AccionesDeLaFicha';

/**
 * Las acciones de la ficha de competición (FE #705).
 *
 * Había hasta siete botones del mismo peso en seis colores —verde, naranja,
 * azul, rojo, morado y gris—, así que ninguno destacaba y el que de verdad
 * tocaba se perdía. Ahora: UNA acción, la del momento, y el resto en un menú.
 */

const t = (clave) => clave;

const PRINCIPAL = { id: 'draft', label: 'Ir a la sala de draft', onClick: vi.fn() };
const GESTION = [
  { id: 'edit', label: 'Editar', onClick: vi.fn() },
  { id: 'manageSchedule', label: 'Gestionar calendario', onClick: vi.fn() },
];
const DESTRUCTIVAS = [
  { id: 'cancel', label: 'Cancelar competición', onClick: vi.fn() },
  { id: 'delete', label: 'Eliminar', onClick: vi.fn() },
];

const pintar = (props = {}) =>
  render(
    <AccionesDeLaFicha
      principal={PRINCIPAL}
      acciones={GESTION}
      destructivas={DESTRUCTIVAS}
      t={t}
      {...props}
    />
  );

describe('AccionesDeLaFicha · una acción y un menú (FE #705)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('A1: se ofrece la acción del momento, y solo esa', () => {
    pintar();

    expect(screen.getByTestId('accion-principal')).toHaveTextContent('Ir a la sala de draft');
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelar competición')).not.toBeInTheDocument();
  });

  it('A2: el resto aparece al abrir el menú', () => {
    pintar();

    fireEvent.click(screen.getByTestId('menu-acciones'));

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Gestionar calendario')).toBeInTheDocument();
  });

  it('A3: lo que no tiene vuelta atrás va separado y en rojo', () => {
    pintar();
    fireEvent.click(screen.getByTestId('menu-acciones'));

    const borrar = screen.getByTestId('accion-delete');
    expect(borrar.className).toMatch(/red/);
    expect(screen.getByTestId('accion-edit').className).not.toMatch(/red/);
    expect(screen.getByTestId('separador-destructivas')).toBeInTheDocument();
  });

  it('A4: al elegir una del menú se ejecuta y el menú se cierra', () => {
    pintar();
    fireEvent.click(screen.getByTestId('menu-acciones'));

    fireEvent.click(screen.getByText('Editar'));

    expect(GESTION[0].onClick).toHaveBeenCalled();
    expect(screen.queryByText('Gestionar calendario')).not.toBeInTheDocument();
  });

  it('A5: Escape cierra el menú', () => {
    pintar();
    fireEvent.click(screen.getByTestId('menu-acciones'));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('A6: tocar fuera también lo cierra', () => {
    pintar();
    fireEvent.click(screen.getByTestId('menu-acciones'));

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('A7: una competición cancelada no tiene siguiente paso, pero sí menú', () => {
    pintar({ principal: null });

    expect(screen.queryByTestId('accion-principal')).not.toBeInTheDocument();
    expect(screen.getByTestId('menu-acciones')).toBeInTheDocument();
  });

  it.each([
    // FE #729: sin principal el «···» está en el borde izquierdo, y abrirse
    // hacia la izquierda lo sacaba de la pantalla
    ['A7b: sin principal, se abre hacia la derecha', { principal: null }, 'left-0'],
    ['A7c: con principal, hacia la izquierda en el móvil', {}, 'right-0'],
    // Desde `sm` la principal ya no ocupa todo el ancho y el «···» queda cerca
    // del borde izquierdo: ahí se abre hacia la derecha (revisión local)
    ['A7d: con principal, hacia la derecha desde sm', {}, 'sm:left-0'],
  ])('%s', (_caso, props, lado) => {
    pintar(props);
    fireEvent.click(screen.getByTestId('menu-acciones'));

    expect(screen.getByRole('menu').className).toContain(lado);
  });

  it('A8: sin nada que ofrecer no se pinta ni el menú', () => {
    // Un jugador que solo mira: la ficha no le da botones de organizador
    pintar({ principal: null, acciones: [], destructivas: [] });

    expect(screen.queryByTestId('menu-acciones')).not.toBeInTheDocument();
  });

  it('A9: el menú se anuncia como tal para quien navega con teclado', () => {
    pintar();
    const boton = screen.getByTestId('menu-acciones');

    expect(boton).toHaveAttribute('aria-haspopup', 'menu');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('A10: el botón dice qué menú abre', () => {
    pintar();
    const boton = screen.getByTestId('menu-acciones');
    fireEvent.click(boton);

    const menu = screen.getByRole('menu');
    expect(menu.id).not.toBe('');
    expect(boton).toHaveAttribute('aria-controls', menu.id);
  });

  it('A11: al cerrarlo con Escape, el foco vuelve al botón', () => {
    // Si no, quien va con teclado se queda sin sitio en la página
    pintar();
    const boton = screen.getByTestId('menu-acciones');
    fireEvent.click(boton);
    screen.getByTestId('accion-edit').focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  it('A12: y al elegir una acción, también', () => {
    pintar();
    const boton = screen.getByTestId('menu-acciones');
    fireEvent.click(boton);
    screen.getByTestId('accion-edit').focus();

    fireEvent.click(screen.getByTestId('accion-edit'));

    expect(GESTION[0].onClick).toHaveBeenCalled();
    expect(boton).toHaveFocus();
  });
});
