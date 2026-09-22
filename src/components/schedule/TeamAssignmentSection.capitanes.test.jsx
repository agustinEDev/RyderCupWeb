import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';

/**
 * Los capitanes, a la vista en los equipos del calendario (FE #692, pieza 2).
 *
 * Quien mira el reparto tiene que saber quién capitanea cada equipo: es la
 * pantalla donde se preparan las sesiones, y el capitán es quien monta las
 * parejas.
 */

const t = (clave, params) => {
  if (params?.team) return `${clave}_${params.team}`;
  if (params?.count !== undefined) return `${clave}_${params.count}`;
  return clave;
};

const NOMBRES = { teamA: 'Europa', teamB: 'América' };
const mapaDeNombres = new Map([
  ['ana', 'Ana Alba'],
  ['bea', 'Bea Blanco'],
  ['carla', 'Carla Cruz'],
  ['dani', 'Dani Díaz'],
]);
const REPARTO = { teamAPlayerIds: ['ana', 'carla'], teamBPlayerIds: ['bea', 'dani'] };

const pintar = (captains) =>
  render(
    <TeamAssignmentSection
      teamAssignment={REPARTO}
      onAssignTeams={() => {}}
      canManage
      playerNameMap={mapaDeNombres}
      enrollments={[]}
      teamNames={NOMBRES}
      maxPlayingHandicap={null}
      captains={captains}
      t={t}
    />
  );

const filaDe = (nombre) => screen.getByText(nombre).closest('li');

describe('TeamAssignmentSection · los capitanes se ven en el reparto (FE #692)', () => {
  it('T1: cada capitán sale marcado en su equipo', () => {
    pintar({ teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null });

    // Dentro de la tarjeta de su equipo: el nombre del equipo ya está en el título
    expect(within(filaDe('Ana Alba')).getByText('teams.captainTag')).toBeInTheDocument();
    expect(within(filaDe('Bea Blanco')).getByText('teams.captainTag')).toBeInTheDocument();
    expect(within(filaDe('Carla Cruz')).queryByText(/captainTag/)).not.toBeInTheDocument();
  });

  it('T2: y el subcapitán también, que es quien asciende si el capitán se va', () => {
    pintar({ teamA: 'ana', teamB: 'bea', viceTeamA: 'carla', viceTeamB: null });

    expect(within(filaDe('Carla Cruz')).getByText('teams.viceCaptainTag')).toBeInTheDocument();
    expect(within(filaDe('Dani Díaz')).queryByText(/aptainTag/)).not.toBeInTheDocument();
  });

  it('T3: sin capitanes no se marca a nadie', () => {
    pintar(undefined);

    expect(screen.queryByText(/captainTag/)).not.toBeInTheDocument();
  });

  it('T4: la etiqueta solo sale en la tarjeta del equipo que corresponde', () => {
    // Si los capitanes y el reparto se desincronizan —repartir de nuevo libera
    // los subcapitanes—, la etiqueta no puede mentir en el equipo contrario
    pintar({ teamA: 'ana', teamB: 'bea', viceTeamA: 'dani', viceTeamB: null });

    expect(within(filaDe('Dani Díaz')).queryByText('teams.viceCaptainTag')).not.toBeInTheDocument();
    expect(within(filaDe('Ana Alba')).getByText('teams.captainTag')).toBeInTheDocument();
  });
});
