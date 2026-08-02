import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import MyQuickMatchesPage from './MyQuickMatchesPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockListMyQuickMatches = vi.fn();
const mockGetQuickMatch = vi.fn();
const mockGetGolfCourse = vi.fn();

vi.mock('../../composition', () => ({
  listMyQuickMatchesUseCase: { execute: (...args) => mockListMyQuickMatches(...args) },
  getQuickMatchUseCase: { execute: (...args) => mockGetQuickMatch(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetGolfCourse(...args) },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/quick-matches']}>
      <Routes>
        <Route path="/quick-matches" element={<MyQuickMatchesPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('MyQuickMatchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuickMatch.mockResolvedValue({ participants: [], holeScores: [], effectiveAllowance: 100 });
    mockGetGolfCourse.mockResolvedValue({ holes: [], tees: [] });
  });

  it('should show an empty state when the user has no quick matches', async () => {
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [], totalCount: 0, page: 1, limit: 50 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('history.empty')).toBeInTheDocument();
    });
  });

  it('should list quick matches and navigate to the scoring page on click', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-1', matchFormat: 'SINGLES', status: 'IN_PROGRESS', createdAt: '2026-07-27T10:00:00Z' },
        { id: 'qm-2', matchFormat: 'FOURBALL', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
      ],
      totalCount: 2,
      page: 1,
      limit: 50,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-history-item-qm-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('quick-match-history-item-qm-2')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-match-history-item-qm-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  it('should show the custom name instead of the format when the match has one', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-1', matchFormat: 'SINGLES', status: 'IN_PROGRESS', createdAt: '2026-07-27T10:00:00Z', name: 'Viernes con Rafa' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Viernes con Rafa')).toBeInTheDocument();
    });
  });

  it("should show the current user's own to-par result and gross strokes on a completed match's card", async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-2', golfCourseId: 'course-1', matchFormat: 'FOURBALL', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });
    mockGetQuickMatch.mockResolvedValue({
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Test User', handicap: 0 }],
      holeScores: [
        { holeNumber: 1, participantId: 'user-1', score: 4 },
        { holeNumber: 2, participantId: 'user-1', score: 2 },
      ],
      effectiveAllowance: 100,
    });
    mockGetGolfCourse.mockResolvedValue({
      holes: [
        { holeNumber: 1, par: 4, strokeIndex: 5 },
        { holeNumber: 2, par: 3, strokeIndex: 15 },
      ],
      tees: [],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-result-qm-2')).toBeInTheDocument();
    });
    // Net strokes 6 (0 handicap, no strokes received) vs par played 7 -> 1 under par.
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('history.grossStrokes')).toBeInTheDocument();
  });

  it('should not fetch or show a result for matches that are not completed', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-1', golfCourseId: 'course-1', matchFormat: 'SINGLES', status: 'IN_PROGRESS', createdAt: '2026-07-27T10:00:00Z' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-history-item-qm-1')).toBeInTheDocument();
    });
    expect(mockGetQuickMatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('quick-match-result-qm-1')).not.toBeInTheDocument();
  });

  it('should show an error message when the fetch fails', async () => {
    mockListMyQuickMatches.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
