import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import QuickMatchScorecardTable from './QuickMatchScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

const holes = [
  { holeNumber: 1, par: 4, strokeIndex: 5 },
  { holeNumber: 2, par: 3, strokeIndex: 15 },
];

const participants = [
  { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
  { participantId: 'p-2', name: 'Bob', handicap: 0, team: null, isGuest: false },
];

describe('QuickMatchScorecardTable', () => {
  it('should render the classification table ranked by Stableford points', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 5 }, // net bogey -> 1 pt
      { holeNumber: 1, participantId: 'p-2', score: 3 }, // net birdie -> 3 pts
    ];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    const classificationTable = screen.getByTestId('quick-match-classification-table');
    const rows = within(classificationTable).getAllByRole('row').slice(1); // skip header row
    expect(within(rows[0]).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
  });

  it('should highlight the current participant and mark them as "you"', () => {
    render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByText('scoring.classification.you', { exact: false })).toBeInTheDocument();
  });

  it('should render the hole-by-hole grid with GolfFigure scores', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByTestId('quick-match-scorecard-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('golf-figure').length).toBeGreaterThan(0);
  });
});
