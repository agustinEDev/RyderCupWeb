import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
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

const INSCRITOS = ['ana', 'bea', 'carla', 'dani'].map((userId) => ({
  userId,
  status: 'APPROVED',
}));

const pintar = (captains, extra = {}) =>
  render(
    <TeamAssignmentSection
      teamAssignment={REPARTO}
      onAssignTeams={() => {}}
      onFillCaptain={() => {}}
      canManage
      playerNameMap={mapaDeNombres}
      enrollments={INSCRITOS}
      teamNames={NOMBRES}
      maxPlayingHandicap={null}
      captains={captains}
      status="CLOSED"
      t={t}
      {...extra}
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

  it('T5: un equipo sin capitán ofrece cubrir el puesto, y el otro no', () => {
    // Pasa si el capitán se retira tras el reparto sin subcapitán que ascienda:
    // repartir otra vez pide los dos y nombrarlos ya no se puede (RyderCupAm#320)
    pintar({ teamA: null, teamB: 'bea', viceTeamA: null, viceTeamB: null });

    expect(screen.getByTestId('cubrir-capitan-A')).toBeInTheDocument();
    expect(screen.queryByTestId('cubrir-capitan-B')).not.toBeInTheDocument();
  });

  it('T6: quien no organiza no lo ve', () => {
    pintar({ teamA: null, teamB: 'bea', viceTeamA: null, viceTeamB: null }, { canManage: false });

    expect(screen.queryByTestId('cubrir-capitan-A')).not.toBeInTheDocument();
  });

  it('T7: al pulsarlo dice qué equipo hay que cubrir', () => {
    const cubrir = vi.fn();
    pintar({ teamA: null, teamB: 'bea', viceTeamA: null, viceTeamB: null }, { onFillCaptain: cubrir });

    fireEvent.click(screen.getByTestId('cubrir-capitan-A'));

    expect(cubrir).toHaveBeenCalledWith('A');
  });

  it('T8: también cuando el capitán sigue puesto pero ya no está inscrito', () => {
    // Se retiró con el torneo en marcha, donde las bajas no tocan a los
    // capitanes, y luego se volvió a CERRADA (RyderCupAm#320)
    pintar({ teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null }, {
      enrollments: INSCRITOS.filter((e) => e.userId !== 'ana'),
    });

    expect(screen.getByTestId('cubrir-capitan-A')).toBeInTheDocument();
    expect(screen.queryByTestId('cubrir-capitan-B')).not.toBeInTheDocument();
  });

  it.each(['IN_PROGRESS', 'COMPLETED'])('T9: con el torneo %s no se ofrece: el servidor lo rechaza', (estado) => {
    pintar({ teamA: null, teamB: 'bea', viceTeamA: null, viceTeamB: null }, { status: estado });

    expect(screen.queryByTestId('cubrir-capitan-A')).not.toBeInTheDocument();
  });
});

describe('TeamAssignmentSection · el hándicap no se parte (FE #710)', () => {
  it('H1: «HCP 18.0» no encoge ni salta de línea junto a un nombre largo', () => {
    // A 360 px se partía en dos líneas: el nombre largo le quitaba el sitio
    pintar(null, {
      enrollments: INSCRITOS.map((e) => ({ ...e, userHandicap: 18 })),
    });

    const hcp = within(filaDe('Ana Alba')).getByText('HCP 18.0').parentElement;
    expect(hcp.className).toContain('shrink-0');
    expect(hcp.className).toContain('whitespace-nowrap');
  });
});
