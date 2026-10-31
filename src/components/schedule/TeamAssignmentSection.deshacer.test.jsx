import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';

/**
 * Con los equipos formados, quedan así (decidido el 29-30 oct 2026, F4).
 *
 * | Quién y cuándo                               | Ve                         |
 * |----------------------------------------------|----------------------------|
 * | Organizador, con equipos y sin partidos      | «Deshacer equipos»         |
 * | Organizador, con partidos                    | Nada: ya no se deshacen    |
 * | Quien no organiza                            | Nada                       |
 * | Nadie, con los equipos formados              | «Repartir equipos»         |
 */
const t = (clave) => clave;

const pintar = ({ canManage = true, sePuedenDeshacer = true, onUndoTeams = vi.fn() } = {}) => {
  render(
    <TeamAssignmentSection
      teamAssignment={{ teamAPlayerIds: ['ana'], teamBPlayerIds: ['bea'], mode: 'DRAFT' }}
      onAssignTeams={vi.fn()}
      onUndoTeams={onUndoTeams}
      sePuedenDeshacer={sePuedenDeshacer}
      onFillCaptain={vi.fn()}
      canManage={canManage}
      playerNameMap={new Map([['ana', 'Ana Alba'], ['bea', 'Bea Blanco']])}
      enrollments={[
        { userId: 'ana', status: 'APPROVED' },
        { userId: 'bea', status: 'APPROVED' },
      ]}
      teamNames={{ teamA: 'Europa', teamB: 'América' }}
      maxPlayingHandicap={null}
      captains={{ teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null }}
      status="CLOSED"
      t={t}
    />
  );
  return onUndoTeams;
};

describe('TeamAssignmentSection · deshacer los equipos', () => {
  it('el organizador, sin partidos, los puede deshacer', () => {
    const onUndoTeams = pintar();

    fireEvent.click(screen.getByTestId('deshacer-equipos'));

    expect(screen.getByTestId('deshacer-equipos')).toHaveTextContent('teams.undo');
    expect(onUndoTeams).toHaveBeenCalledTimes(1);
  });

  it('con partidos ya no', () => {
    pintar({ sePuedenDeshacer: false });

    expect(screen.queryByTestId('deshacer-equipos')).not.toBeInTheDocument();
  });

  it('quien no organiza, tampoco', () => {
    pintar({ canManage: false });

    expect(screen.queryByTestId('deshacer-equipos')).not.toBeInTheDocument();
  });

  it('con los equipos formados no se vuelven a repartir: se deshacen antes', () => {
    pintar();

    // Se llame como se llame: el único botón es el de deshacerlos
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['teams.undo']);
  });
});
