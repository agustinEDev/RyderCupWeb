import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';
import { abreviaturaDeHandicap } from './__fixtures__/abreviaturaDeHandicap';

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
  const abreviatura = abreviaturaDeHandicap(clave, params);
  if (abreviatura) return abreviatura;
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

// Un hándicap plus se guarda negativo y se lee con «+» (FE #797)
describe('TeamAssignmentSection · hándicap plus (FE #797)', () => {
  it('H1: el plus con «+» y el positivo sin signo', () => {
    render(
      <TeamAssignmentSection
        teamAssignment={{ ...REPARTO, mode: 'MANUAL' }}
        onAssignTeams={() => {}}
        onFillCaptain={() => {}}
        canManage
        playerNameMap={new Map([['ana', 'Ana Alba'], ['bea', 'Bea Blanco']])}
        enrollments={[
          { userId: 'ana', status: 'APPROVED', userHandicap: -2 },
          { userId: 'bea', status: 'APPROVED', userHandicap: 12.4 },
        ]}
        teamNames={NOMBRES}
        maxPlayingHandicap={null}
        captains={{ teamA: null, teamB: null, viceTeamA: null, viceTeamB: null }}
        status="CLOSED"
        t={t}
      />
    );

    expect(screen.getByText('HCP +2.0')).toBeInTheDocument();
    expect(screen.getByText('HCP 12.4')).toBeInTheDocument();
  });
  // Revisión del 21 oct: el tope también pasa por t(), y se lee igual
  it('H2: por encima del tope, «| 18 Lim.» tras el índice', () => {
    render(
      <TeamAssignmentSection
        teamAssignment={{ ...REPARTO, mode: 'MANUAL' }}
        onAssignTeams={() => {}}
        onFillCaptain={() => {}}
        canManage
        playerNameMap={new Map([['ana', 'Ana Alba'], ['bea', 'Bea Blanco']])}
        enrollments={[
          { userId: 'ana', status: 'APPROVED', userHandicap: 24 },
          { userId: 'bea', status: 'APPROVED', userHandicap: 12.4 },
        ]}
        teamNames={NOMBRES}
        maxPlayingHandicap={18}
        captains={{ teamA: null, teamB: null, viceTeamA: null, viceTeamB: null }}
        status="CLOSED"
        t={t}
      />
    );

    expect(screen.getByText('HCP 24.0')).toBeInTheDocument();
    expect(screen.getAllByText('| 18 Lim.')).toHaveLength(1);
  });
});
