import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchCard from './MatchCard';

/**
 * El nombre no se parte a mitad de palabra (pasada del Kind, 1 nov 2026: a
 * 360 px, con el HCP al lado, «Organi/za» en ~44 px).
 *
 * | #  | Caso                               | Queda                                        |
 * |----|------------------------------------|----------------------------------------------|
 * | N1 | Nombre y HCP no caben en una fila  | El HCP baja debajo: la fila se parte (flex-wrap) |
 * | N2 | Una palabra que no cabe ni sola    | Se parte por letras, como antes (break-words) |
 */
const t = (clave, params) => (params ? `${clave}:${Object.values(params).join(',')}` : clave);

describe('MatchCard · nombres a 360 px', () => {
  it('N1/N2: la fila del jugador se parte antes que el nombre', () => {
    render(
      <MatchCard
        match={{
          id: 'm1',
          matchNumber: 1,
          status: 'SCHEDULED',
          teamAPlayers: [{ userId: 'olga', playerHandicap: 18, playingHandicap: 30 }],
          teamBPlayers: [{ userId: 'ana', playerHandicap: 18, playingHandicap: 30 }],
        }}
        matchFormat="SINGLES"
        canManage={false}
        playerNameMap={new Map([['olga', 'Olga Organiza'], ['ana', 'Ana Prueba']])}
        playerHandicapMap={new Map()}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        t={t}
      />
    );

    const nombre = screen.getByText('Olga Organiza');
    expect(nombre.parentElement).toHaveClass('flex-wrap');
    expect(nombre).toHaveClass('break-words', 'min-w-0');
  });
});
