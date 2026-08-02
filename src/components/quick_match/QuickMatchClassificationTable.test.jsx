import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import QuickMatchClassificationTable from './QuickMatchClassificationTable';

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

describe('QuickMatchClassificationTable', () => {
  it('should render the classification table ranked by Stableford points', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 5 }, // net bogey -> 1 pt
      { holeNumber: 1, participantId: 'p-2', score: 3 }, // net birdie -> 3 pts
    ];

    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    const classificationTable = screen.getByTestId('quick-match-classification-table');
    const rows = within(classificationTable).getAllByRole('row').slice(1); // skip header row
    expect(within(rows[0]).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
  });

  it('should highlight the current participant and mark them as "you"', () => {
    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={[]}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(screen.getByText('scoring.classification.you', { exact: false })).toBeInTheDocument();
  });

  it('should show each participant\'s holes played in the Hoyo column', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 5 },
      { holeNumber: 2, participantId: 'p-1', score: 4 },
      { holeNumber: 1, participantId: 'p-2', score: 3 },
    ];

    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    const classificationTable = screen.getByTestId('quick-match-classification-table');
    const rows = within(classificationTable).getAllByRole('row').slice(1);
    const aliceRow = rows.find((row) => within(row).queryByText('Alice'));
    const bobRow = rows.find((row) => within(row).queryByText('Bob'));
    const lastCell = (row) => within(row).getAllByRole('cell').at(-1);
    expect(lastCell(aliceRow)).toHaveTextContent('2');
    expect(lastCell(bobRow)).toHaveTextContent('1');
  });

  it('should not show the finished badge while the match is still in progress', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
        isCompleted={false}
      />
    );

    expect(screen.queryByText('scoring.classification.finishedBadge')).not.toBeInTheDocument();
  });

  it('should show the finished badge next to points and strokes once the match is completed', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
        isCompleted
      />
    );

    // 2 participants x 2 cells each (points/netStrokes + strokes) = 4 badges
    expect(screen.getAllByText('scoring.classification.finishedBadge')).toHaveLength(4);
  });

  it('should rank by net strokes when scoringFormat is MEDAL', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 4 },
      { holeNumber: 1, participantId: 'p-2', score: 3 },
    ];

    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="MEDAL"
      />
    );

    const classificationTable = screen.getByTestId('quick-match-classification-table');
    const rows = within(classificationTable).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
  });

  it('should show the match standing instead of a Stableford ranking for match-play formats', () => {
    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={[]}
        participants={participants}
        currentParticipantId="p-1"
        standing={{ status: '2UP', leadingTeam: 'A', holesPlayed: 5, holesRemaining: 13, isDecided: false }}
      />
    );

    expect(screen.getByTestId('quick-match-standing')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // p-1 (Alice) resolves to team A positionally, since neither participant has an explicit team
    expect(screen.getByText('scoring.classification.leads')).toBeInTheDocument();
  });

  it('should show an all-square message when the match-play standing has no leader', () => {
    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={[]}
        participants={participants}
        currentParticipantId="p-1"
        standing={{ status: 'AS', leadingTeam: null, holesPlayed: 4, holesRemaining: 14, isDecided: false }}
      />
    );

    expect(screen.getByText('scoring.classification.allSquare')).toBeInTheDocument();
  });

  it('should show a placeholder when no holes have been played yet in a match-play quick match', () => {
    render(
      <QuickMatchClassificationTable
        holes={holes}
        holeScores={[]}
        participants={participants}
        currentParticipantId="p-1"
        standing={null}
      />
    );

    expect(screen.getByTestId('quick-match-standing-empty')).toBeInTheDocument();
  });
});
