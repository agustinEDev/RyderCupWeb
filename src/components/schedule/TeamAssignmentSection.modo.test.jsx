import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';

/**
 * Cómo se repartieron los equipos, escrito en cristiano.
 *
 * Visto en el Kind el 23 sep: con los equipos salidos de una sala de draft, la
 * tarjeta ponía «Modo de Asignación: teams.draft». La clave no existía en
 * ningún idioma e i18next, cuando no la encuentra, devuelve la clave misma.
 */

// `t` como el de verdad: si la clave no existe, devuelve la clave
const CLAVES = {
  'teams.mode': 'Modo de Asignación',
  'teams.manual': 'Manual',
  'teams.automatic': 'Automática',
  'teams.draft': 'Draft de capitanes',
};
const t = (clave, params) => {
  if (params?.defaultValue !== undefined) return CLAVES[clave] ?? params.defaultValue;
  return CLAVES[clave] ?? clave;
};

const REPARTO = { teamAPlayerIds: ['ana'], teamBPlayerIds: ['bea'] };
const NOMBRES = { teamA: 'Europa', teamB: 'América' };

const pintar = (mode) =>
  render(
    <TeamAssignmentSection
      teamAssignment={{ ...REPARTO, mode }}
      onAssignTeams={() => {}}
      onFillCaptain={() => {}}
      canManage
      playerNameMap={new Map([['ana', 'Ana Alba'], ['bea', 'Bea Blanco']])}
      enrollments={[
        { userId: 'ana', status: 'APPROVED' },
        { userId: 'bea', status: 'APPROVED' },
      ]}
      teamNames={NOMBRES}
      maxPlayingHandicap={null}
      captains={{ teamA: null, teamB: null, viceTeamA: null, viceTeamB: null }}
      status="CLOSED"
      t={t}
    />
  );

describe('TeamAssignmentSection · cómo se repartieron los equipos', () => {
  it('M1: el draft se dice con palabras, no con la clave', () => {
    pintar('DRAFT');

    expect(screen.getByText(/Draft de capitanes/)).toBeInTheDocument();
    expect(screen.queryByText(/teams\.draft/)).not.toBeInTheDocument();
  });

  it('M2: y los demás modos siguen igual', () => {
    pintar('AUTOMATIC');

    expect(screen.getByText(/Automática/)).toBeInTheDocument();
  });

  it('M3: un modo que no conozcamos no pinta una clave cruda', () => {
    // Si mañana el backend añade otro modo, la pantalla no puede enseñar
    // «teams.loquesea» mientras nadie escribe su texto
    pintar('LO_QUE_VENGA');

    const linea = screen.getByText(/Modo de Asignación/);
    expect(linea).toHaveTextContent('LO_QUE_VENGA');
    expect(linea).not.toHaveTextContent(/teams\./);
  });
});
