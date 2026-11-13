import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div
      {...Object.fromEntries(
        Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)),
      )}
    >
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

import ReassignPlayersModal from './ReassignPlayersModal';

/**
 * Sin la lista de inscritos no se reasigna (pasada del Kind, 1 nov 2026: la
 * ventana salía vacía con el botón activo). Como el reparto manual.
 *
 * | #  | Caso                     | Queda                                           |
 * |----|--------------------------|-------------------------------------------------|
 * | R1 | La lista no cargó        | Aviso de recargar; «Reasignar» desactivado y descrito por él |
 * | R2 | La lista cargó           | Como siempre: sin aviso y «Reasignar» activo    |
 */
const t = (clave) => clave;
const partido = {
  id: 'm1',
  matchNumber: 1,
  teamAPlayers: [{ userId: 'ana' }],
  teamBPlayers: [{ userId: 'bea' }],
};
const inscritos = [
  { userId: 'ana', userName: 'Ana Alba', status: 'APPROVED' },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED' },
];
const pintar = (props) =>
  render(
    <ReassignPlayersModal
      isOpen
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      match={partido}
      isProcessing={false}
      teamNames={{ teamA: 'A', teamB: 'B' }}
      t={t}
      {...props}
    />,
  );
const reasignar = () =>
  screen.getByRole('button', { name: 'matches.reassignPlayers' });

describe('ReassignPlayersModal · sin la lista de inscritos', () => {
  it('R1: avisa de recargar y no deja reasignar', () => {
    const onConfirm = vi.fn();
    pintar({ enrollments: [], inscritosSinCargar: true, onConfirm });
    // Ni enviando el formulario (con Intro, sin pasar por el botón)
    fireEvent.submit(reasignar().closest('form'));
    expect(onConfirm).not.toHaveBeenCalled();

    const aviso = screen.getByTestId('reasignar-inscritos-sin-cargar');
    expect(aviso).toHaveTextContent('matches.reassignNeedsEnrollments');
    expect(reasignar()).toBeDisabled();
    expect(reasignar()).toHaveAttribute('aria-describedby', aviso.id);
  });

  it('R2: con la lista, como siempre', () => {
    pintar({ enrollments: inscritos });

    expect(
      screen.queryByTestId('reasignar-inscritos-sin-cargar'),
    ).not.toBeInTheDocument();
    expect(reasignar()).not.toBeDisabled();
    expect(reasignar()).not.toHaveAttribute('aria-describedby');
  });
});
