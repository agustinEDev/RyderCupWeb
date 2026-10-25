import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/** F10 (25 oct 2026): la retirada del organizador solo para quien gestiona. */
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../composition', () => ({
  getMatchDetailUseCase: {
    execute: vi.fn().mockResolvedValue({ id: 'm-1', status: 'IN_PROGRESS', teamAPlayers: [], teamBPlayers: [] }),
  },
}));
vi.mock('./RetiradaPorElOrganizador', () => ({
  default: ({ matchId }) => <div data-testid="retirada-organizador">{matchId}</div>,
}));

const { default: MatchDetailModal } = await import('./MatchDetailModal');

const pinta = (canManage, matchFormat = 'FOURBALL') =>
  render(
    <MatchDetailModal
      isOpen
      onClose={() => {}}
      matchId="m-1"
      playerNameMap={new Map()}
      playerHandicapMap={new Map()}
      teamNames={{ teamA: 'A', teamB: 'B' }}
      t={(k) => k}
      canManage={canManage}
      matchFormat={matchFormat}
    />
  );

describe('MatchDetailModal · retirada del organizador', () => {
  it('F10: quien gestiona la ve', async () => {
    pinta(true);
    expect(await screen.findByTestId('retirada-organizador')).toHaveTextContent('m-1');
  });

  // /code-review (26 oct 2026): en individual o foursomes no hay retirada, y
  // leer la vista de anotar para nada pesa
  it.each(['SINGLES', 'FOURSOMES', null])('F10: en %s, no se monta', async (formato) => {
    pinta(true, formato);
    await screen.findByText('status.IN_PROGRESS');
    expect(screen.queryByTestId('retirada-organizador')).not.toBeInTheDocument();
  });

  it('F10: un jugador que mira el calendario, no', async () => {
    pinta(false);
    await screen.findByText('status.IN_PROGRESS');
    expect(screen.queryByTestId('retirada-organizador')).not.toBeInTheDocument();
  });
});
