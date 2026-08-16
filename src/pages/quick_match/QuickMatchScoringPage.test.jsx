import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import QuickMatchScoringPage from './QuickMatchScoringPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockUseQuickMatchScoring = vi.fn();
vi.mock('../../hooks/useQuickMatchScoring', () => ({
  useQuickMatchScoring: (...args) => mockUseQuickMatchScoring(...args),
}));

// Regression fixture: the shape ListMyQuickMatchesUseCase/GetQuickMatchUseCase
// actually return (QuickMatchAssembler.toSimpleDTO) — isCompleted is a plain
// boolean field here, NOT a method, unlike the raw QuickMatch domain entity.
const baseQuickMatch = {
  id: 'qm-1',
  name: null,
  matchFormat: null,
  scoringFormat: 'STABLEFORD',
  status: 'COMPLETED',
  isCompleted: true,
  participants: [
    { participantId: 'user-1', userId: 'user-1', name: 'Test User', handicap: 0 },
    { participantId: 'user-2', userId: 'user-2', name: 'Friend', handicap: 0 },
  ],
  holeScores: [],
  standing: null,
  effectiveAllowance: 100,
};

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/quick-matches/qm-1/scoring']}>
      <Routes>
        <Route path="/quick-matches/:quickMatchId/scoring" element={<QuickMatchScoringPage />} />
        <Route path="/quick-matches" element={<div data-testid="my-quick-matches-page" />} />
      </Routes>
    </MemoryRouter>
  );
};

const baseHookState = {
  quickMatch: baseQuickMatch,
  holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
  tees: [],
  courseName: 'Real Club de Golf',
  currentHole: 1,
  isLoading: false,
  loadError: null,
  saveError: null,
  isSubmitting: false,
  myParticipant: baseQuickMatch.participants[0],
  isCreator: false,
  isScorer: false,
  coveredParticipantIds: [],
  totalHoles: 1,
};

describe('QuickMatchScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('should render the classification tab for a completed match without crashing', async () => {
    // Regression test: the page used to call quickMatch.isCompleted() as a
    // function to compute the classification table's isCompleted prop, but
    // this DTO shape has it as a plain boolean — threw
    // "quickMatch.isCompleted is not a function" and crashed the whole page.
    renderPage();

    fireEvent.click(screen.getByTestId('quick-match-tab-classification'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-classification-table')).toBeInTheDocument();
    });
  });

  it('should show the golf course the match was played on', () => {
    renderPage();

    expect(screen.getByTestId('quick-match-course-name')).toHaveTextContent('Real Club de Golf');
  });

  it('should not show the course line while the course has not been loaded yet', () => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      courseName: null,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.queryByTestId('quick-match-course-name')).not.toBeInTheDocument();
  });

  it('should navigate back to the quick matches list, not the dashboard', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /backToMyQuickMatches/ }));

    await waitFor(() => {
      expect(screen.getByTestId('my-quick-matches-page')).toBeInTheDocument();
    });
  });
});

describe('QuickMatchScoringPage - copia de los errores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithError = (error, quickMatch = null, kind = 'load') => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch,
      loadError: kind === 'load' ? error : null,
      saveError: kind === 'save' ? error : null,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });
    return renderPage();
  };

  const withStatus = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };

  /**
   * El `detail` del backend está en inglés, y llegaba tal cual a una pantalla
   * en español: "You are not a participant of this quick match."
   */
  it('traduce un 403 de carga en vez de pintar el mensaje del servidor', () => {
    renderWithError(withStatus('You are not a participant of this quick match.', 403));

    const shown = screen.getByTestId('quick-match-scoring-error');
    expect(shown).toHaveTextContent('scoring.errors.forbidden');
    expect(shown).not.toHaveTextContent('You are not a participant');
  });

  it('traduce un 404 de carga con su propia copia', () => {
    renderWithError(withStatus('Quick match not found', 404));

    expect(screen.getByTestId('quick-match-scoring-error')).toHaveTextContent(
      'scoring.errors.notFound'
    );
  });

  it('cae al mensaje genérico cuando el error de carga no trae status', () => {
    renderWithError(new Error('Failed to fetch'));

    const shown = screen.getByTestId('quick-match-scoring-error');
    expect(shown).toHaveTextContent('scoring.errors.generic');
    expect(shown).not.toHaveTextContent('Failed to fetch');
  });

  /**
   * `useQuickMatchScoring` guarda en el MISMO estado el fallo de cargar y el de
   * guardar, así que el status por sí solo no basta: un 403 al anotar es "no
   * eres el anotador de ese jugador", y decirle "no participas en esta partida"
   * a alguien que se está viendo en la lista es peor que no decirle nada.
   */
  it('no dice "no participas" ante un 403 al anotar, con la partida en pantalla', () => {
    renderWithError(
      withStatus('You are not an assigned scorer for this participant.', 403),
      baseQuickMatch,
      'save'
    );

    const shown = screen.getByTestId('quick-match-scoring-error');
    expect(shown).toHaveTextContent('scoring.errors.saveForbidden');
    expect(shown).not.toHaveTextContent('scoring.errors.forbidden"');
    expect(shown).not.toHaveTextContent('You are not an assigned scorer');
  });

  it('distingue el conflicto y la validación al anotar, que antes caían en el genérico', () => {
    renderWithError(withStatus('Quick match is already completed.', 409), baseQuickMatch, 'save');
    expect(screen.getByTestId('quick-match-scoring-error')).toHaveTextContent(
      'scoring.errors.saveConflict'
    );

    renderWithError(withStatus('Score must be between 1 and 20.', 422), baseQuickMatch, 'save');
    expect(screen.getAllByTestId('quick-match-scoring-error')[1]).toHaveTextContent(
      'scoring.errors.saveInvalid'
    );
  });

  /**
   * El sondeo cada 10 s recarga la partida mucho después de que se cargara la
   * primera vez, y `fetchQuickMatch` conserva la anterior a propósito. Con la
   * partida en pantalla, deducir la operación de su presencia daba la copia de
   * guardado a un fallo que es de carga.
   */
  it('un 403 del sondeo, con la partida ya en pantalla, sigue siendo un error de carga', () => {
    renderWithError(
      withStatus('You are not a participant of this quick match.', 403),
      baseQuickMatch,
      'load'
    );

    const shown = screen.getByTestId('quick-match-scoring-error');
    expect(shown).toHaveTextContent('scoring.errors.forbidden');
    expect(shown).not.toHaveTextContent('scoring.errors.saveForbidden');
  });

  it('un fallo de red al anotar dice que no se ha podido guardar, no un error de carga', () => {
    renderWithError(new Error('Failed to fetch'), baseQuickMatch, 'save');

    const shown = screen.getByTestId('quick-match-scoring-error');
    expect(shown).toHaveTextContent('scoring.errors.saveFailed');
    expect(shown).not.toHaveTextContent('Failed to fetch');
  });
});
