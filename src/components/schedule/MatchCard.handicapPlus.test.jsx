import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockDetalle = vi.fn();
vi.mock('../../composition', () => ({
  getMatchDetailUseCase: { execute: (...a) => mockDetalle(...a) },
}));

import MatchCard from './MatchCard';
import MatchDetailModal from './MatchDetailModal';
import { abreviaturaDeHandicap } from './__fixtures__/abreviaturaDeHandicap';

/**
 * Un hándicap plus se guarda negativo y se lee con «+» (FE #797).
 *
 *   #   caso                        | qué se ve
 *   ----|---------------------------|---------------------------
 *   H1  índice -2.0                 | «HCP +2.0»
 *   H2  de juego -2                 | «PH: +2»
 *   H3  positivos                   | «HCP 12.4», «PH: 18», sin signo
 *   H4  cero                        | «HCP 0.0», «PH: 0»
 *   H6  el tope de juego no cambia  | «PH: 18 Lim.» con el tope en 18
 */
const t = (clave, params) => abreviaturaDeHandicap(clave, params) ?? clave;

const partido = (jugadorA, jugadorB) => ({
  id: 'm1',
  matchNumber: 1,
  status: 'SCHEDULED',
  teamAPlayers: [jugadorA],
  teamBPlayers: [jugadorB],
});

const nombres = new Map([
  ['ana', 'Ana'],
  ['bea', 'Bea'],
]);

const pintarTarjeta = (m, extra = {}) =>
  render(
    <MatchCard
      match={m}
      matchFormat="SINGLES"
      canManage={false}
      playerNameMap={nombres}
      playerHandicapMap={new Map()}
      teamNames={{ teamA: 'A', teamB: 'B' }}
      t={t}
      {...extra}
    />
  );

const pintarDetalle = (m, extra = {}) => {
  mockDetalle.mockResolvedValue(m);
  return render(
    <MemoryRouter>
      <MatchDetailModal
        matchId={m.id}
        isOpen
        onClose={() => {}}
        playerNameMap={nombres}
        playerHandicapMap={new Map()}
        teamNames={{ teamA: 'A', teamB: 'B' }}
        t={t}
        {...extra}
      />
    </MemoryRouter>
  );
};

const plus = { userId: 'ana', playerHandicap: -2, playingHandicap: -2 };
const normal = { userId: 'bea', playerHandicap: 12.4, playingHandicap: 18 };

describe('MatchCard · hándicap plus (FE #797)', () => {
  it('H1 y H2: el plus lleva «+» en el índice y en el de juego', () => {
    pintarTarjeta(partido(plus, normal));

    expect(screen.getByText('HCP +2.0')).toBeInTheDocument();
    expect(screen.getByText('PH: +2')).toBeInTheDocument();
    expect(screen.queryByText(/-2/)).toBeNull();
  });

  it('H3: un positivo va sin signo', () => {
    pintarTarjeta(partido(plus, normal));

    expect(screen.getByText('HCP 12.4')).toBeInTheDocument();
    expect(screen.getByText('PH: 18')).toBeInTheDocument();
  });

  it('H4: el cero va sin signo', () => {
    pintarTarjeta(partido({ userId: 'ana', playerHandicap: -0, playingHandicap: 0 }, normal));

    expect(screen.getByText('HCP 0.0')).toBeInTheDocument();
    expect(screen.getByText('PH: 0')).toBeInTheDocument();
  });

  it('H2: el plus con tope también lleva su «+»', () => {
    pintarTarjeta(partido(plus, normal), { maxPlayingHandicap: -3 });

    expect(screen.getByText('PH: +2 Lim.')).toBeInTheDocument();
  });

  it('H6: el tope compara el número, no el texto', () => {
    pintarTarjeta(partido(plus, normal), { maxPlayingHandicap: 18 });

    expect(screen.getByText('PH: 18 Lim.')).toBeInTheDocument();
    expect(screen.getByText('PH: +2')).toBeInTheDocument();
  });
});

describe('MatchDetailModal · hándicap plus (FE #797)', () => {
  it('H1 y H2: el plus lleva «+» en el índice y en el de juego', async () => {
    pintarDetalle(partido(plus, normal));

    expect(await screen.findByText('HCP +2.0')).toBeInTheDocument();
    expect(screen.getByText('PH: +2')).toBeInTheDocument();
    expect(screen.getByText('HCP 12.4')).toBeInTheDocument();
    expect(screen.getByText('PH: 18')).toBeInTheDocument();
  });

  it('H2: el plus con tope también lleva su «+»', async () => {
    pintarDetalle(partido(plus, normal), { maxPlayingHandicap: -3 });

    expect(await screen.findByText('PH: +2 Lim.')).toBeInTheDocument();
  });
});
