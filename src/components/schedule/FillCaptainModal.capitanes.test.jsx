import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FillCaptainModal from './FillCaptainModal';

/**
 * Cubrir el puesto de un capitán que se fue (FE #692).
 *
 * Se elige entre los de ese equipo que siguen inscritos: quien se retiró sigue
 * en la lista del reparto, pero ya no puede capitanear nada.
 */
vi.mock('../ui/ModalShell', () => ({
  default: ({ children, isOpen }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

const t = (clave, params) => (params?.team ? `${clave}_${params.team}` : clave);

const JUGADORES = [
  { userId: 'carla', name: 'Carla Cruz' },
  { userId: 'dani', name: 'Dani Díaz' },
];

const pintar = (props = {}) =>
  render(
    <FillCaptainModal
      isOpen
      team="A"
      teamName="Europa"
      players={JUGADORES}
      onConfirm={props.onConfirm || vi.fn()}
      onClose={vi.fn()}
      isLoading={false}
      t={t}
      {...props}
    />
  );

const dialogo = () => screen.getByRole('dialog');

describe('FillCaptainModal (FE #692)', () => {
  it('C1: ofrece a los del equipo y dice de qué equipo se trata', () => {
    pintar();

    expect(within(dialogo()).getByText('teams.fillCaptainTitle_Europa')).toBeInTheDocument();
    const opciones = within(within(dialogo()).getByRole('combobox'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual(expect.arrayContaining(['Carla Cruz', 'Dani Díaz']));
  });

  it('C2: no se confirma hasta elegir a alguien', () => {
    pintar();
    const boton = within(dialogo()).getByRole('button', { name: 'teams.fillCaptainConfirm' });

    expect(boton).toBeDisabled();
    fireEvent.change(within(dialogo()).getByRole('combobox'), { target: { value: 'dani' } });
    expect(boton).toBeEnabled();
  });

  it('C3: al confirmar manda el jugador elegido', () => {
    const onConfirm = vi.fn();
    pintar({ onConfirm });

    fireEvent.change(within(dialogo()).getByRole('combobox'), { target: { value: 'carla' } });
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'teams.fillCaptainConfirm' }));

    expect(onConfirm).toHaveBeenCalledWith('carla');
  });

  it('C4: sin nadie a quien elegir lo dice, y no deja confirmar', () => {
    // Todo el equipo se retiró: elegir «nadie» mandaría un capitán inventado
    pintar({ players: [] });

    expect(within(dialogo()).getByText('teams.fillCaptainNobody')).toBeInTheDocument();
    expect(within(dialogo()).getByRole('button', { name: 'teams.fillCaptainConfirm' })).toBeDisabled();
  });
});
