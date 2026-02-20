import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useParams: () => ({ matchId: 'm-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

const mockUseScoring = {
  scoringView: {
    matchNumber: 1,
    matchFormat: 'SINGLES',
    matchStatus: 'IN_PROGRESS',
    competitionId: 'c-1',
    isDecided: false,
    decidedResult: null,
    markerAssignments: [
      { scorerUserId: 'u1', marksUserId: 'u2', marksName: 'Player B', markedByName: 'Player B' },
    ],
    players: [
      { userId: 'u1', userName: 'Player A', team: 'A' },
      { userId: 'u2', userName: 'Player B', team: 'B' },
    ],
    holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 })),
    scores: [],
    matchStanding: null,
    scorecardSubmittedBy: [],
  },
  currentHole: 1,
  isLoading: false,
  error: null,
  isSubmitting: false,
  matchSummary: null,
  isOffline: false,
  isSessionBlocked: false,
  pendingQueueSize: 0,
  isMatchPlayer: true,
  hasSubmitted: false,
  validatedHoles: 0,
  totalHoles: 18,
  canSubmitScorecard: false,
  setCurrentHole: vi.fn(),
  submitScore: vi.fn(),
  submitScorecard: vi.fn(),
  concedeMatch: vi.fn(),
  refetch: vi.fn(),
};

vi.mock('../../hooks/useScoring', () => ({
  useScoring: () => mockUseScoring,
}));

vi.mock('../../composition', () => ({
  getLeaderboardUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

// Mock all scoring components to simple stubs
vi.mock('../../components/scoring/HoleInput', () => ({
  default: (props) => <div data-testid="hole-input">HoleInput {props.holeNumber}</div>,
}));
vi.mock('../../components/scoring/HoleSelector', () => ({
  default: () => <div data-testid="hole-selector">HoleSelector</div>,
}));
vi.mock('../../components/scoring/ScorecardTable', () => ({
  default: () => <div data-testid="scorecard-table">ScorecardTable</div>,
}));
vi.mock('../../components/scoring/LeaderboardView', () => ({
  default: () => <div data-testid="leaderboard-view">LeaderboardView</div>,
}));
vi.mock('../../components/scoring/PreMatchInfo', () => ({
  default: () => <div data-testid="pre-match-info">PreMatchInfo</div>,
}));
vi.mock('../../components/scoring/MatchSummaryCard', () => ({
  default: () => <div data-testid="match-summary-card">MatchSummaryCard</div>,
}));
vi.mock('../../components/scoring/OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner">OfflineBanner</div>,
}));
vi.mock('../../components/scoring/SessionBlockedModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="session-blocked-modal">SessionBlocked</div> : null,
}));
vi.mock('../../components/scoring/EarlyEndModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="early-end-modal">EarlyEnd</div> : null,
}));
vi.mock('../../components/scoring/ConcedeMatchModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="concede-match-modal">Concede</div> : null,
}));
vi.mock('../../components/scoring/SubmitScorecardModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="submit-scorecard-modal">Submit</div> : null,
}));

import ScoringPage from './ScoringPage';

describe('ScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the scoring page with tabs', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('scoring-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-input')).toBeInTheDocument();
    expect(screen.getByTestId('tab-scorecard')).toBeInTheDocument();
    expect(screen.getByTestId('tab-leaderboard')).toBeInTheDocument();
  });

  it('should show input tab by default', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('hole-input')).toBeInTheDocument();
    expect(screen.getByTestId('hole-selector')).toBeInTheDocument();
  });

  it('should show pre-match info on hole 1', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('pre-match-info')).toBeInTheDocument();
  });

  it('should switch to scorecard tab', () => {
    render(<ScoringPage />);
    fireEvent.click(screen.getByTestId('tab-scorecard'));
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should switch to leaderboard tab', () => {
    render(<ScoringPage />);
    fireEvent.click(screen.getByTestId('tab-leaderboard'));
    expect(screen.getByTestId('leaderboard-view')).toBeInTheDocument();
  });

  it('should show match header info', () => {
    render(<ScoringPage />);
    expect(screen.getByText(/matchHeader/)).toBeInTheDocument();
    expect(screen.getByText('SINGLES')).toBeInTheDocument();
  });

  it('should render header', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
  });

  it('should not show offline banner when online', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('should not show session blocked modal when not blocked', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('session-blocked-modal')).toBeNull();
  });

  it('should show prev/next hole navigation', () => {
    render(<ScoringPage />);
    expect(screen.getByText('input.prevHole')).toBeInTheDocument();
    expect(screen.getByText('input.nextHole')).toBeInTheDocument();
  });
});
