import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('should render the hole-by-hole grid with GolfFigure scores', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByTestId('quick-match-scorecard-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('golf-figure').length).toBeGreaterThan(0);
  });

  it('should not render a classification table anymore (moved to its own tab)', () => {
    render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.queryByTestId('quick-match-classification-table')).not.toBeInTheDocument();
  });

  it('should mark a hole with a stroke dot when the participant receives a stroke there', () => {
    // handicap 18 -> exactly 1 stroke on every hole (mirrors StablefordCalculator's own test fixture)
    const highHandicapParticipants = [
      { participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false },
    ];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={highHandicapParticipants}
        currentParticipantId="p-1"
      />
    );

    expect(screen.getAllByTestId('stroke-dots').length).toBeGreaterThan(0);
  });

  it('should not mark a stroke dot for a scratch (0 handicap) participant', () => {
    const scratchParticipants = [
      { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
    ];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={scratchParticipants}
        currentParticipantId="p-1"
      />
    );

    expect(screen.queryByTestId('stroke-dots')).not.toBeInTheDocument();
  });

  it('should use the Playing Handicap (via tee + allowance) instead of the raw handicap when resolving stroke dots', () => {
    const participant = [
      { participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
    ];
    const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 7, slopeRating: 113 }];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    // 20% allowance drops the Playing Handicap well below stroke index 5, so no dot should show
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participant}
        currentParticipantId="p-1"
        tees={tees}
        allowancePercentage={20}
      />
    );

    expect(screen.queryByTestId('stroke-dots')).not.toBeInTheDocument();
  });

  it('should render a separate card per participant instead of one shared table', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByTestId('quick-match-player-card-p-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-2')).toBeInTheDocument();
  });

  it('should show Stableford points per hole when scoringFormat is STABLEFORD', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(screen.getAllByTestId('hole-points').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('hole-net-strokes')).not.toBeInTheDocument();
  });

  it('should show net strokes per hole when scoringFormat is MEDAL', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="MEDAL"
      />
    );

    expect(screen.getAllByTestId('hole-net-strokes').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('hole-points')).not.toBeInTheDocument();
  });

  it('should not show points or net strokes badges for match-play formats', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.queryByTestId('hole-points')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hole-net-strokes')).not.toBeInTheDocument();
  });
});
