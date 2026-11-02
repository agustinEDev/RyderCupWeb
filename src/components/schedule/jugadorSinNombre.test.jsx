import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockDetalle = vi.fn();
vi.mock('../../composition', () => ({
  getMatchDetailUseCase: { execute: (...a) => mockDetalle(...a) },
}));
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

import MatchCard from './MatchCard';
import MatchDetailModal from './MatchDetailModal';
import GenerateMatchesModal from './GenerateMatchesModal';
import AssignTeamsModal from './AssignTeamsModal';
import ReassignPlayersModal from './ReassignPlayersModal';

/**
 * En la agenda, a quien le falta el nombre sale como «Jugador», traducido
 * (pasada del Kind, 31 oct 2026): ni su UUID, ni «--», ni «Unknown».
 *
 * | #  | Dónde                         | Antes            | Ahora        |
 * |----|-------------------------------|------------------|--------------|
 * | M1 | Tarjeta del partido           | «Unknown Player» | unnamedPlayer|
 * | M2 | Detalle del partido           | el UUID          | unnamedPlayer|
 * | G1 | Generar partidos, a mano      | «Unknown»        | unnamedPlayer|
 * | A1 | Repartir equipos, a mano      | «Unknown»        | unnamedPlayer|
 * | R1 | Reasignar jugadores           | «Unknown»        | unnamedPlayer|
 */
const t = (clave) => clave;
const UUID = 'd0feb2d2-dee9-47aa-bc01-c368299d32fe';
const sinNombre = { userId: UUID, playerHandicap: 12, playingHandicap: 12 };
const partido = {
  id: 'm1',
  matchNumber: 1,
  status: 'SCHEDULED',
  teamAPlayers: [sinNombre],
  teamBPlayers: [{ userId: 'bea', playerHandicap: 10, playingHandicap: 10 }],
};
const nombres = new Map([['bea', 'Bea Blanco']]);
const inscritos = [
  { userId: UUID, status: 'APPROVED', userHandicap: 12 },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED', userHandicap: 10 },
];

const sinRastro = () => {
  expect(screen.queryByText(UUID, { exact: false })).not.toBeInTheDocument();
  expect(screen.queryByText(/Unknown/)).not.toBeInTheDocument();
};

describe('Agenda · jugador sin nombre', () => {
  it('M1: la tarjeta del partido dice «Jugador»', () => {
    render(
      <MatchCard
        match={partido}
        matchFormat="SINGLES"
        canManage={false}
        playerNameMap={nombres}
        playerHandicapMap={new Map()}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        t={t}
      />
    );

    expect(screen.getByText('unnamedPlayer')).toBeInTheDocument();
    expect(screen.getByText('Bea Blanco')).toBeInTheDocument();
    sinRastro();
  });

  it('M2: el detalle del partido dice «Jugador»', async () => {
    mockDetalle.mockResolvedValue(partido);
    render(
      <MemoryRouter>
        <MatchDetailModal
          matchId="m1"
          isOpen
          onClose={() => {}}
          playerNameMap={nombres}
          playerHandicapMap={new Map()}
          teamNames={{ teamA: 'A', teamB: 'B' }}
          t={t}
        />
      </MemoryRouter>
    );

    expect(await screen.findByText('unnamedPlayer')).toBeInTheDocument();
    expect(screen.queryByText('--')).not.toBeInTheDocument();
    sinRastro();
  });

  it('G1: al generar a mano, la opción dice «Jugador»', () => {
    render(
      <GenerateMatchesModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        round={{ id: 'r-1', matchFormat: 'SINGLES' }}
        enrollments={inscritos}
        teamAssignment={{ teamAPlayerIds: [UUID], teamBPlayerIds: ['bea'] }}
        isProcessing={false}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        playerNameMap={nombres}
        t={t}
      />
    );
    fireEvent.click(screen.getByDisplayValue('manual'));

    expect(screen.getByRole('option', { name: /^unnamedPlayer/ })).toBeInTheDocument();
    sinRastro();
  });

  it('A1: al repartir a mano, la fila dice «Jugador»', () => {
    render(
      <AssignTeamsModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        enrollments={inscritos}
        isProcessing={false}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        captains={{ teamA: null, teamB: null }}
        t={t}
      />
    );
    fireEvent.click(screen.getByDisplayValue('manual'));

    expect(screen.getByText('unnamedPlayer')).toBeInTheDocument();
    sinRastro();
  });

  it('R1: al reasignar, la fila dice «Jugador»', () => {
    render(
      <ReassignPlayersModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        match={partido}
        enrollments={inscritos}
        isProcessing={false}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        t={t}
      />
    );

    expect(screen.getByText('unnamedPlayer')).toBeInTheDocument();
    sinRastro();
  });
});
