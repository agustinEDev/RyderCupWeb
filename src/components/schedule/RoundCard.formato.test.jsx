import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));

import RoundCard from './RoundCard';

/**
 * Una sesión sin formato (`match_format` nulo, RyderCupAm#541): el calendario
 * no pinta «formats.null» ni un separador colgando.
 *
 *   #   caso            | qué se ve
 *   ----|-----------------|-------------------------------
 *   F1  con formato     | su nombre
 *   F2  sin formato     | ni «formats.null» ni «formats.undefined»
 */
const ronda = (matchFormat) => ({
  id: 'r1',
  roundDate: '2026-10-03',
  sessionType: 'MORNING',
  matchFormat,
  status: 'PENDING_TEAMS',
  golfCourseId: 'g1',
  matches: [],
});

const pintar = (r) =>
  render(
    <RoundCard
      round={r}
      canEdit={false}
      isExpanded={false}
      onToggleExpand={() => {}}
      golfCourses={[{ id: 'g1', name: 'Altea' }]}
      playerNameMap={{}}
      playerHandicapMap={{}}
      teamNames={{}}
      t={(clave) => clave}
    />
  );

describe('RoundCard · sin formato', () => {
  it('F1: con formato, su nombre', () => {
    pintar(ronda('FOURBALL'));

    expect(screen.getByText('formats.FOURBALL')).toBeInTheDocument();
  });

  it.each([null, undefined])('F2: sin formato (%s), nada', (formato) => {
    const { container } = pintar(ronda(formato));

    expect(container).not.toHaveTextContent(/formats\./);
    expect(screen.getByText('sessions.MORNING')).toBeInTheDocument();
  });
});
