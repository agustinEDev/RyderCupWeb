import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchCard from './MatchCard';
import MatchStatus from '../../domain/value_objects/MatchStatus';

/**
 * El color del estado de cada partido (Tabla E1, 18 nov 2026).
 *
 * | #  | Estado      | Color                                  |
 * |----|-------------|----------------------------------------|
 * | C1 | SCHEDULED   | azul, como antes                       |
 * | C2 | IN_PROGRESS | verde, como antes                      |
 * | C3 | COMPLETED   | gris oscuro, como antes                |
 * | C4 | WALKOVER    | naranja, como antes                    |
 * | C5 | CONCEDED    | el de COMPLETED (E1-9: antes no tenía) |
 */
const t = (clave) => clave;

const etiquetaDe = (status) => {
  render(
    <MatchCard
      match={{
        id: 'm1',
        matchNumber: 1,
        status,
        teamAPlayers: [],
        teamBPlayers: [],
      }}
      matchFormat="SINGLES"
      canManage={false}
      playerNameMap={new Map()}
      playerHandicapMap={new Map()}
      teamNames={{ teamA: 'A', teamB: 'B' }}
      t={t}
    />,
  );
  return screen.getByText(`status.${status}`);
};

describe('MatchCard · color del estado', () => {
  it.each([
    [MatchStatus.SCHEDULED, ['bg-blue-100', 'text-blue-800']],
    [MatchStatus.IN_PROGRESS, ['bg-green-100', 'text-green-800']],
    [MatchStatus.COMPLETED, ['bg-gray-100', 'text-gray-800']],
    [MatchStatus.WALKOVER, ['bg-orange-100', 'text-orange-800']],
    [MatchStatus.CONCEDED, ['bg-gray-100', 'text-gray-800']],
  ])('%s lleva su color', (status, clases) => {
    expect(etiquetaDe(status)).toHaveClass(...clases);
  });

  it('C5: un partido concedido se pinta como uno terminado, no con el gris de reserva', () => {
    expect(etiquetaDe(MatchStatus.CONCEDED)).not.toHaveClass('text-gray-700');
  });
});
