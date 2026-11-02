import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';

/**
 * Sin la lista de inscritos, el panel no ofrece «Nombrar capitán» (31 oct 2026):
 * no se sabe quién sigue. Solo consta que falta el que no está nombrado, y para
 * ese avisa de recargar.
 *
 * | #  | Caso                                   | Ve                          |
 * |----|----------------------------------------|-----------------------------|
 * | P1 | Falta el capitán de B                  | El aviso en B, no en A      |
 * | P2 | Ya terminada                           | Nada: no se puede cubrir    |
 * | P3 | Quien no organiza                      | Nada                        |
 */
const t = (clave) => clave;

const pintar = ({ captains, status = 'CLOSED', canManage = true } = {}) =>
  render(
    <TeamAssignmentSection
      teamAssignment={{ teamAPlayerIds: ['ana'], teamBPlayerIds: ['bea'], mode: 'DRAFT' }}
      onAssignTeams={vi.fn()}
      onUndoTeams={vi.fn()}
      sePuedenDeshacer
      onFillCaptain={vi.fn()}
      canManage={canManage}
      playerNameMap={new Map()}
      enrollments={[]}
      teamNames={{ teamA: 'Europa', teamB: 'América' }}
      maxPlayingHandicap={null}
      captains={captains ?? { teamA: 'ana', teamB: null, viceTeamA: null, viceTeamB: null }}
      status={status}
      inscritosSinCargar
      t={t}
    />
  );

describe('TeamAssignmentSection · sin la lista de inscritos', () => {
  it('P1: falta el capitán de B: el aviso sale en B y en A nada', () => {
    pintar();

    expect(screen.getByTestId('capitan-inscritos-sin-cargar-B')).toHaveTextContent(
      'teams.fillCaptainNeedsEnrollments'
    );
    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-A')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cubrir-capitan-B')).not.toBeInTheDocument();
  });

  it('P2: terminada ya no se cubre, así que tampoco se avisa', () => {
    pintar({ status: 'COMPLETED' });

    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-B')).not.toBeInTheDocument();
  });

  it('P3: quien no organiza no ve el aviso', () => {
    pintar({ canManage: false });

    expect(screen.queryByTestId('capitan-inscritos-sin-cargar-B')).not.toBeInTheDocument();
  });
});
