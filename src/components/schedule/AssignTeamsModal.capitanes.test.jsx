import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AssignTeamsModal from './AssignTeamsModal';

/**
 * El reparto manual respeta a los capitanes (FE #692, pieza 2).
 *
 * Nombrarlos ya los fija en su equipo (RyderCupAM#320): el servidor rechaza un
 * reparto que los cambie de sitio, así que el modal no puede ofrecer moverlos.
 * Salen ya puestos en el suyo y sin botones que engañen.
 */

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }) => <div {...props}>{children}</div> }),
}));

const t = (clave, params) => {
  if (params?.team) return `${clave}_${params.team}`;
  if (params?.count !== undefined) return `${clave}_${params.count}`;
  return clave;
};

const INSCRITOS = [
  { userId: 'ana', userName: 'Ana Alba', status: 'APPROVED', userHandicap: 8 },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED', userHandicap: 12 },
  { userId: 'carla', userName: 'Carla Cruz', status: 'APPROVED', userHandicap: 15 },
  { userId: 'dani', userName: 'Dani Díaz', status: 'APPROVED', userHandicap: 20 },
];

const NOMBRES = { teamA: 'Europa', teamB: 'América' };

const pintar = (props = {}) =>
  render(
    <AssignTeamsModal
      isOpen
      onClose={vi.fn()}
      onConfirm={props.onConfirm || vi.fn()}
      enrollments={INSCRITOS}
      isProcessing={false}
      teamNames={NOMBRES}
      t={t}
      {...props}
    />
  );

const aManual = () => fireEvent.click(screen.getByText('teams.manual'));

const filaDe = (nombre) => screen.getByText(nombre).closest('div.flex.items-center.justify-between');

const CAPITANES = { teamA: 'ana', teamB: 'bea' };

describe('AssignTeamsModal · los capitanes van fijos en su equipo (FE #692)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('M1: cada capitán sale ya puesto en el suyo', () => {
    pintar({ captains: CAPITANES });
    aManual();

    const filaAna = filaDe('Ana Alba');
    const filaBea = filaDe('Bea Blanco');
    expect(within(filaAna).getByRole('button', { name: 'Europa' })).toBeDisabled();
    expect(within(filaBea).getByRole('button', { name: 'América' })).toBeDisabled();
  });

  it('M2: y no se pueden mover al otro equipo', () => {
    const onConfirm = vi.fn();
    pintar({ captains: CAPITANES, onConfirm });
    aManual();

    fireEvent.click(within(filaDe('Ana Alba')).getByRole('button', { name: 'América' }));
    fireEvent.click(within(filaDe('Carla Cruz')).getByRole('button', { name: 'Europa' }));
    fireEvent.click(within(filaDe('Dani Díaz')).getByRole('button', { name: 'América' }));
    fireEvent.click(screen.getByRole('button', { name: 'teams.assign' }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'manual',
      team_a_player_ids: ['ana', 'carla'],
      team_b_player_ids: ['bea', 'dani'],
    });
  });

  it('M3: el resto se reparte como siempre, con los capitanes dentro', () => {
    const onConfirm = vi.fn();
    pintar({ captains: CAPITANES, onConfirm });
    aManual();

    fireEvent.click(within(filaDe('Carla Cruz')).getByRole('button', { name: 'Europa' }));
    fireEvent.click(within(filaDe('Dani Díaz')).getByRole('button', { name: 'América' }));
    fireEvent.click(screen.getByRole('button', { name: 'teams.assign' }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'manual',
      team_a_player_ids: ['ana', 'carla'],
      team_b_player_ids: ['bea', 'dani'],
    });
  });

  it('M4: se dice por qué no se pueden mover', () => {
    pintar({ captains: CAPITANES });
    aManual();

    expect(screen.getByText('teams.captainsFixed')).toBeInTheDocument();
    // Sin el nombre del equipo: lo dice el botón resaltado de al lado, y con
    // equipos de nombre largo la etiqueta se cortaba en «Capitán de E...»
    expect(within(filaDe('Ana Alba')).getByText('teams.captainTag')).toBeInTheDocument();
    expect(within(filaDe('Bea Blanco')).getByText('teams.captainTag')).toBeInTheDocument();
  });

  it('M5: sin capitanes, el reparto de siempre: nadie fijo ni preasignado', () => {
    const onConfirm = vi.fn();
    pintar({ onConfirm });
    aManual();

    expect(screen.queryByText('teams.captainsFixed')).not.toBeInTheDocument();
    expect(within(filaDe('Ana Alba')).getByRole('button', { name: 'Europa' })).toBeEnabled();
    fireEvent.click(within(filaDe('Ana Alba')).getByRole('button', { name: 'Europa' }));
    fireEvent.click(within(filaDe('Bea Blanco')).getByRole('button', { name: 'América' }));
    fireEvent.click(within(filaDe('Carla Cruz')).getByRole('button', { name: 'Europa' }));
    fireEvent.click(within(filaDe('Dani Díaz')).getByRole('button', { name: 'América' }));
    fireEvent.click(screen.getByRole('button', { name: 'teams.assign' }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'manual',
      team_a_player_ids: ['ana', 'carla'],
      team_b_player_ids: ['bea', 'dani'],
    });
  });

  it('M6: con un solo capitán no se fija a nadie: el servidor pedirá el que falta', () => {
    pintar({ captains: { teamA: 'ana', teamB: null } });
    aManual();

    expect(screen.queryByText('teams.captainsFixed')).not.toBeInTheDocument();
    expect(within(filaDe('Ana Alba')).getByRole('button', { name: 'América' })).toBeEnabled();
  });

  it('M7: no se reparte dejando gente fuera: todos los inscritos tienen equipo', () => {
    // Con los capitanes ya puestos, el botón se activaba nada más abrir, y dos
    // toques guardaban un reparto de dos que borra el anterior y deja al resto
    // sin equipo. En una Ryder juegan todos
    pintar({ captains: CAPITANES });
    aManual();
    // Se vuelve a buscar en cada paso: al aparecer y desaparecer el aviso, React
    // rehace ese trozo del formulario y el botón de antes ya no es el de ahora
    const asignar = () => screen.getByRole('button', { name: 'teams.assign' });

    expect(asignar()).toBeDisabled();
    fireEvent.click(within(filaDe('Carla Cruz')).getByRole('button', { name: 'Europa' }));
    expect(asignar()).toBeDisabled();
    fireEvent.click(within(filaDe('Dani Díaz')).getByRole('button', { name: 'América' }));
    expect(asignar()).toBeEnabled();
  });

  it('M8: y lo dice mientras falte alguien', () => {
    pintar({ captains: CAPITANES });
    aManual();

    expect(screen.getByText('teams.everyoneNeedsTeam_2')).toBeInTheDocument();
    fireEvent.click(within(filaDe('Carla Cruz')).getByRole('button', { name: 'Europa' }));
    expect(screen.getByText('teams.everyoneNeedsTeam_1')).toBeInTheDocument();
    fireEvent.click(within(filaDe('Dani Díaz')).getByRole('button', { name: 'América' }));
    expect(screen.queryByText(/everyoneNeedsTeam/)).not.toBeInTheDocument();
  });

  it('M9: con un solo capitán lo avisa antes, en vez de esperar al 400', () => {
    pintar({ captains: { teamA: 'ana', teamB: null } });

    expect(screen.getByText('teams.captainMissing')).toBeInTheDocument();
  });

  it('M9b: y con los equipos ya repartidos manda al sitio correcto', () => {
    // «Nómbralo en la competición» deja de valer en cuanto hay equipos: ahí el
    // servidor ya no deja nombrarlos, y se cubre desde el panel de equipos
    pintar({ captains: { teamA: 'ana', teamB: null }, hasTeams: true });

    expect(screen.getByText('teams.captainMissingWithTeams')).toBeInTheDocument();
    expect(screen.queryByText('teams.captainMissing')).not.toBeInTheDocument();
  });

  it('M10: el reparto automático también lo exige, así que el aviso sale igual', () => {
    pintar({ captains: { teamA: null, teamB: 'bea' } });

    expect(screen.getByText('teams.captainMissing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'teams.assign' })).toBeDisabled();
  });
});
