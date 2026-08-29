import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import QuickMatchScoringPage from './QuickMatchScoringPage';
import { apuntaFalloDeRed, apuntaRespuestaDelServidor, olvidaElEstadoDeConexion } from '../../services/estadoDeConexion';

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
      cancelMatch: vi.fn(),
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

  /**
   * El par, el stroke index y los metros son de la barra que juega cada uno.
   * `holes` es solo la tarjeta de la PRIMERA barra del campo, y en 56 de los
   * 800 campos federados el stroke index cambia de una barra a otra: pintar esa
   * tarjeta a quien juega otra le ensena un indice que no es el suyo, mientras
   * el reparto de golpes -que si resuelve la barra- le da golpe en otro hoyo.
   */
  describe('tarjeta de la barra del jugador', () => {
    const renderWithCard = ({ holes, tees, participant, others = [], currentHole = 1 }) => {
      const me = { ...baseHookState.myParticipant, ...participant };
      mockUseQuickMatchScoring.mockReturnValue({
        ...baseHookState,
        quickMatch: { ...baseQuickMatch, participants: [me, ...others] },
        holes,
        tees,
        currentHole,
        totalHoles: holes.length,
        myParticipant: me,
        // La cabecera del hoyo solo se pinta a quien anota
        isScorer: true,
        coveredParticipantIds: ['user-1', ...others.map((o) => o.participantId)],
        setCurrentHole: vi.fn(),
        submitScore: vi.fn(),
        completeMatch: vi.fn(),
        refetch: vi.fn(),
      });
      return renderPage();
    };

    const teeWithCard = {
      color: 'YELLOW',
      gender: 'MALE',
      holes: [{ holeNumber: 1, par: 3, strokeIndex: 15, meters: 142 }],
    };

    it('pinta el par y el indice de su barra, no los del campo', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [teeWithCard],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
      });

      expect(screen.getByText('input.par 3')).toBeInTheDocument();
      expect(screen.getByText('input.strokeIndex 15')).toBeInTheDocument();
      expect(screen.queryByText('input.par 4')).not.toBeInTheDocument();
      expect(screen.queryByText('input.strokeIndex 5')).not.toBeInTheDocument();
    });

    it('muestra los metros de la barra', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [teeWithCard],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
      });

      expect(screen.getByText('input.meters 142')).toBeInTheDocument();
    });

    it('cae a la tarjeta del campo cuando la barra no trae la suya', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [{ color: 'YELLOW', gender: 'MALE' }],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
      });

      expect(screen.getByText('input.par 4')).toBeInTheDocument();
      expect(screen.getByText('input.strokeIndex 5')).toBeInTheDocument();
    });

    /**
     * Las salidas dadas de alta a mano no traen metros, y la tarjeta del campo
     * no tiene donde guardarlos. Se ensena la etiqueta con un guion: el hueco
     * se lee como "aqui falta el dato", y la cabecera no cambia de tamano
     * segun el campo.
     */

    /**
     * Quien anota puede estar anotando a alguien de otra barra: con una sola
     * cabecera se le pintaba —y se le dibujaba la figura— contra un par que no
     * era el suyo, mientras sus golpes sí venían resueltos por su barra.
     */
    it('con barras distintas, la cabecera es la de quien anota y el otro lleva la suya', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [
          teeWithCard,
          {
            color: 'RED',
            gender: 'FEMALE',
            holes: [{ holeNumber: 1, par: 5, strokeIndex: 3, meters: 300 }],
          },
        ],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
        others: [
          {
            participantId: 'user-2',
            userId: 'user-2',
            name: 'Friend',
            handicap: 0,
            color: 'RED',
            teeGender: 'FEMALE',
          },
        ],
      });

      // Los mios, en la cabecera: es la vuelta que estoy jugando
      expect(screen.getByText('input.par 3')).toBeInTheDocument();
      expect(screen.getByText('input.meters 142')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-match-hole-facts-user-1')).not.toBeInTheDocument();

      const theirs = screen.getByTestId('quick-match-hole-facts-user-2');
      expect(theirs).toHaveTextContent('input.par 5');
      expect(theirs).toHaveTextContent('input.meters 300');
    });

    it('con la misma barra, los datos van una sola vez en la cabecera', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [teeWithCard],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
      });

      expect(screen.getByText('input.par 3')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-match-hole-facts-user-1')).not.toBeInTheDocument();
    });

    it('ensena la etiqueta con un guion cuando el hoyo no tiene metros', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
      });

      expect(screen.getByText('input.meters -')).toBeInTheDocument();
    });

    /**
     * La reserva de quien no trae su hoyo es la tarjeta del campo, que es de
     * todos, y NUNCA la barra de quien anota: pintarle a otro jugador el par
     * amarillo bajo su nombre es el error que esta pantalla viene a quitar.
     * Pasa con tarjetas importadas a medias, que existen pero no traen el hoyo.
     */
    it('a quien le falta el hoyo en su barra le pinta el del campo, no el de quien anota', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [
          teeWithCard,
          {
            color: 'RED',
            gender: 'FEMALE',
            holes: [{ holeNumber: 2, par: 5, strokeIndex: 3, meters: 300 }],
          },
        ],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
        others: [
          {
            participantId: 'user-2',
            userId: 'user-2',
            name: 'Friend',
            handicap: 0,
            color: 'RED',
            teeGender: 'FEMALE',
          },
        ],
      });

      const theirs = screen.getByTestId('quick-match-hole-facts-user-2');
      expect(theirs).toHaveTextContent('input.par 4');
      expect(theirs).toHaveTextContent('input.strokeIndex 5');
      expect(theirs).not.toHaveTextContent('input.par 3');
      expect(theirs).not.toHaveTextContent('input.meters 142');
    });

    /**
     * Nada obliga a que la tarjeta de una barra este completa: la trae el
     * importador. Con el panel colgando solo de la barra propia, en los hoyos
     * que le faltaran desaparecia la entrada de golpes y no se podia anotar a
     * NADIE, mientras el boton de siguiente seguia llevando hasta alli.
     */
    it('con la barra propia a medias sigue dejando anotar, con la tarjeta del campo', () => {
      renderWithCard({
        holes: [
          { holeNumber: 1, par: 4, strokeIndex: 5 },
          { holeNumber: 2, par: 3, strokeIndex: 11 },
        ],
        tees: [teeWithCard],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
        currentHole: 2,
      });

      expect(screen.getByTestId('quick-match-hole-input')).toBeInTheDocument();
      expect(screen.getByText('input.par 3')).toBeInTheDocument();
      expect(screen.getByText('input.strokeIndex 11')).toBeInTheDocument();
    });

    /**
     * Los metros son justo lo que distingue una barra de otra, y no deciden
     * como se lee el golpe. Comparados junto al par y al indice, cualquier
     * partido mixto partia la cabecera y apretaba los datos de cada uno en
     * media columna a 320 px, que es lo que se acababa de arreglar. Cada campo
     * se mira por su cuenta: del otro jugador solo baja lo que difiera.
     */
    it('con el mismo par e indice pero metros distintos, solo bajan los metros', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [
          { color: 'YELLOW', gender: 'MALE', holes: [{ holeNumber: 1, par: 4, strokeIndex: 5, meters: 142 }] },
          { color: 'RED', gender: 'FEMALE', holes: [{ holeNumber: 1, par: 4, strokeIndex: 5, meters: 300 }] },
        ],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
        others: [
          {
            participantId: 'user-2',
            userId: 'user-2',
            name: 'Friend',
            handicap: 0,
            color: 'RED',
            teeGender: 'FEMALE',
          },
        ],
      });

      // El par y el indice, una sola vez arriba, con mis metros
      expect(screen.getByText('input.par 4')).toBeInTheDocument();
      expect(screen.getByText('input.strokeIndex 5')).toBeInTheDocument();
      expect(screen.getByText('input.meters 142')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-match-hole-facts-user-1')).not.toBeInTheDocument();

      // Del otro jugador solo bajan los metros: el par y el indice son los mismos
      const theirs = screen.getByTestId('quick-match-hole-facts-user-2');
      expect(theirs).toHaveTextContent('input.meters 300');
      expect(theirs).not.toHaveTextContent('input.par');
      expect(theirs).not.toHaveTextContent('input.strokeIndex');
    });

    /**
     * De los 800 campos federados, 56 cambian el indice entre barras y solo 25
     * el par: agrupar los dos repetia debajo del otro jugador un par que ya
     * estaba en la cabecera y era el mismo, justo en el caso mas frecuente.
     */
    it('si solo cambia el indice, no repite debajo el par que ya esta arriba', () => {
      renderWithCard({
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        tees: [
          { color: 'YELLOW', gender: 'MALE', holes: [{ holeNumber: 1, par: 4, strokeIndex: 5, meters: 142 }] },
          { color: 'RED', gender: 'FEMALE', holes: [{ holeNumber: 1, par: 4, strokeIndex: 3, meters: 142 }] },
        ],
        participant: { color: 'YELLOW', teeGender: 'MALE' },
        others: [
          {
            participantId: 'user-2',
            userId: 'user-2',
            name: 'Friend',
            handicap: 0,
            color: 'RED',
            teeGender: 'FEMALE',
          },
        ],
      });

      const theirs = screen.getByTestId('quick-match-hole-facts-user-2');
      expect(theirs).toHaveTextContent('input.strokeIndex 3');
      expect(theirs).not.toHaveTextContent('input.par');
      expect(theirs).not.toHaveTextContent('input.meters');
    });
  });
});

describe('QuickMatchScoringPage · foursomes anota una bola por bando', () => {
  const foursomesMatch = {
    ...baseQuickMatch,
    matchFormat: 'FOURSOMES',
    scoringFormat: null,
    status: 'IN_PROGRESS',
    isCompleted: false,
    participants: [
      { participantId: 'user-1', userId: 'user-1', name: 'Yo', handicap: 18, team: 'A' },
      { participantId: 'p-partner', name: 'Socio', handicap: 12, team: 'A' },
      { participantId: 'p-rival-1', name: 'Rival Uno', handicap: 10, team: 'B' },
      { participantId: 'p-rival-2', name: 'Rival Dos', handicap: 14, team: 'B' },
    ],
    holeScores: [],
  };

  const renderFoursomes = (overrides = {}, submitScore = vi.fn()) => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: { ...foursomesMatch, ...overrides },
      myParticipant: foursomesMatch.participants[0],
      isScorer: true,
      coveredParticipantIds: ['user-1', 'p-partner', 'p-rival-1', 'p-rival-2'],
      setCurrentHole: vi.fn(),
      submitScore,
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });
    renderPage();
    return submitScore;
  };

  it('shows one box per side, named after both partners', () => {
    renderFoursomes();

    expect(screen.getByText('Yo & Socio')).toBeInTheDocument();
    expect(screen.getByText('Rival Uno & Rival Dos')).toBeInTheDocument();
    // Una casilla por bando, no una por jugador.
    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-1')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-partner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-rival-2')).not.toBeInTheDocument();
  });

  /**
   * La bola del bando la anota cualquiera de los dos: si la metió el compañero,
   * la casilla del bando tiene que enseñarla igual. Antes, cada jugador solo
   * veía la suya y el hoyo parecía sin anotar.
   */
  it('shows the ball the partner entered', () => {
    renderFoursomes({
      holeScores: [{ holeNumber: 1, participantId: 'p-partner', score: 5 }],
    });

    expect(screen.getByTestId('quick-match-score-button-user-1')).toHaveTextContent('5');
  });

  it('keeps one box per player in fourball', () => {
    renderFoursomes({ matchFormat: 'FOURBALL' });

    // Dos bolas por bando: cada jugador anota la suya.
    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-partner')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-2')).toBeInTheDocument();
  });

  /**
   * Una bola, una fila: la del primer jugador del bando, la anote quien la
   * anote. A nombre de quien tuviera el móvil, los dos anotadores escribían
   * filas distintas del mismo golpe y cada pantalla leía una.
   */
  it('writes the side ball under the first player of the side', () => {
    const submitScore = vi.fn();
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: foursomesMatch,
      myParticipant: foursomesMatch.participants[2],
      isScorer: true,
      // Anotación cruzada: en foursomes cada anotador cubre a los cuatro.
      coveredParticipantIds: ['user-1', 'p-partner', 'p-rival-1', 'p-rival-2'],
      setCurrentHole: vi.fn(),
      submitScore,
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });

    renderPage();

    // El rival anota la bola del bando de enfrente bajo su primer jugador, no
    // bajo sí mismo ni bajo el compañero.
    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-1')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-partner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-rival-2')).not.toBeInTheDocument();

    // Y al anotar de verdad, el golpe se guarda a ese nombre: que se pinte la
    // casilla correcta no dice nada de bajo quién escribe.
    fireEvent.click(screen.getByTestId('quick-match-score-button-user-1'));
    fireEvent.click(screen.getByText('5').closest('button'));

    expect(submitScore).toHaveBeenCalledWith(1, 'user-1', 5);
  });

  /**
   * Con la anotación cruzada del backend todos cubren la fila del bando. Si no
   * —un backend aún sin ese reparto, o un detalle sin asignaciones— se escribe
   * bajo el primer miembro que sí se cubra: dejar al compañero con la pantalla
   * en blanco y sin poder anotar es peor que una fila a otro nombre.
   */
  it('falls back to a covered member when the card holder is not covered', () => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: foursomesMatch,
      myParticipant: foursomesMatch.participants[0],
      isScorer: true,
      coveredParticipantIds: ['user-1', 'p-rival-2'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-2')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-rival-1')).not.toBeInTheDocument();
  });

  /**
   * Y la casilla enseña la fila que se escribe, no la del titular: con el
   * respaldo mandando, corregir el golpe guardaba bien pero la pantalla seguía
   * devolviendo el viejo, como si la corrección se hubiera perdido.
   */
  it('shows the entry of the row it actually writes to', () => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: {
        ...foursomesMatch,
        holeScores: [
          { holeNumber: 1, participantId: 'p-rival-1', score: 4 },
          { holeNumber: 1, participantId: 'p-rival-2', score: 6 },
        ],
      },
      myParticipant: foursomesMatch.participants[0],
      isScorer: true,
      coveredParticipantIds: ['user-1', 'p-rival-2'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('quick-match-score-button-p-rival-2')).toHaveTextContent('6');
  });

  /** Sin cubrir a nadie del bando no hay dónde escribir: la casilla no se pinta. */
  it('hides the side box when this scorer covers nobody on that side', () => {
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: foursomesMatch,
      myParticipant: foursomesMatch.participants[0],
      isScorer: true,
      coveredParticipantIds: ['user-1', 'p-partner'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-rival-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-score-button-p-rival-2')).not.toBeInTheDocument();
  });

  /**
   * La bola anotada a nombre del compañero cuenta para el hoyo: el selector
   * miraba solo al titular de la tarjeta y el hoyo no llegaba a ponerse verde.
   */
  it('counts a side ball entered under the partner as the side\'s ball', () => {
    renderFoursomes({
      holeScores: [
        { holeNumber: 1, participantId: 'p-partner', score: 4 },
        { holeNumber: 1, participantId: 'p-rival-2', score: 5 },
      ],
    });

    expect(screen.getByTestId('quick-match-hole-btn-1').className).toContain('green');
  });

  /**
   * El hoyo está completo cuando están las dos bolas, no cuatro golpes: el
   * selector contaba los participantes que cubre el anotador —los cuatro, con
   * anotación cruzada— y ningún hoyo de foursomes llegaba a ponerse verde.
   */
  it('marks a foursomes hole complete with one ball per side', () => {
    renderFoursomes({
      holeScores: [
        { holeNumber: 1, participantId: 'user-1', score: 4 },
        { holeNumber: 1, participantId: 'p-rival-1', score: 5 },
      ],
    });

    expect(screen.getByTestId('quick-match-hole-btn-1').className).toContain('green');
  });

  /**
   * Sin `team` no hay bando: cada jugador va solo. Agruparlos a todos bajo el
   * mismo dejaba una única casilla con los cuatro nombres.
   */
  it('keeps a box per player when the participants have no team', () => {
    renderFoursomes({
      participants: foursomesMatch.participants.map((p) => ({ ...p, team: null })),
    });

    expect(screen.getByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-partner')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-score-button-p-rival-2')).toBeInTheDocument();
  });

  describe('raya (bola recogida)', () => {
    const scoringState = (overrides = {}) => ({
      ...baseHookState,
      quickMatch: {
        ...baseQuickMatch,
        status: 'IN_PROGRESS',
        isCompleted: false,
        ...(overrides.quickMatch || {}),
      },
      isScorer: true,
      coveredParticipantIds: ['user-1'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      refetch: vi.fn(),
      ...overrides,
    });

    it('ofrece la raya en Stableford', () => {
      mockUseQuickMatchScoring.mockReturnValue(scoringState());
      renderPage();

      fireEvent.click(screen.getByTestId('quick-match-score-button-user-1'));

      expect(screen.getByTestId('picked-up-button')).toBeInTheDocument();
    });

    it('no ofrece la raya en Medal', () => {
      // En stroke play hay que embocar en todos los hoyos: quien no lo hace no
      // entrega tarjeta. El backend rechaza ahi el score nulo, asi que ofrecer
      // el boton seria ofrecer algo que no se puede guardar.
      mockUseQuickMatchScoring.mockReturnValue(
        scoringState({ quickMatch: { scoringFormat: 'MEDAL' } })
      );
      renderPage();

      fireEvent.click(screen.getByTestId('quick-match-score-button-user-1'));

      expect(screen.queryByTestId('picked-up-button')).not.toBeInTheDocument();
    });

    it('ofrece la raya en match play, donde recoger es conceder el hoyo', () => {
      mockUseQuickMatchScoring.mockReturnValue(
        scoringState({ quickMatch: { scoringFormat: null, matchFormat: 'SINGLES' } })
      );
      renderPage();

      fireEvent.click(screen.getByTestId('quick-match-score-button-user-1'));

      expect(screen.getByTestId('picked-up-button')).toBeInTheDocument();
    });

    it('ensena la raya anotada distinta del hoyo sin anotar', () => {
      mockUseQuickMatchScoring.mockReturnValue(
        scoringState({
          quickMatch: {
            holeScores: [{ holeNumber: 1, participantId: 'user-1', score: null }],
          },
        })
      );
      renderPage();

      const boton = screen.getByTestId('quick-match-score-button-user-1');
      expect(boton.querySelector('[data-picked-up="true"]')).not.toBeNull();
    });
  });

});

describe('QuickMatchScoringPage · cancelar una partida en curso', () => {
  // `baseQuickMatch` esta COMPLETADA; esto es una que se esta jugando
  const enCurso = { ...baseQuickMatch, status: 'IN_PROGRESS', isCompleted: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const comoCreador = (extra = {}) => {
    const cancelMatch = vi.fn();
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: enCurso,
      isCreator: true,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn().mockResolvedValue({ ok: true }),
      cancelMatch,
      refetch: vi.fn(),
      // Al final: antes iba antes y el helper pisaba en silencio cualquier
      // funcion que le pasaran, asi que el `cancelMatch` de quien lo llamara
      // no se invocaba nunca y no habia pista de por que.
      ...extra,
    });
    return { cancelMatch };
  };

  it('offers cancelling to the creator of a match under way', async () => {
    // Hasta ahora no habia salida para una vuelta que se abandona: el unico
    // que puede cerrarla acababa dandola por TERMINADA, metiendo una vuelta a
    // medias en las estadisticas de todo el grupo.
    comoCreador();
    renderPage();

    expect(await screen.findByTestId('quick-match-cancel-button')).toBeInTheDocument();
  });

  it('does not offer it to someone who did not create the match', async () => {
    // El servidor lo rechaza con NotQuickMatchCreatorError, asi que ofrecerlo
    // seria enseñar un boton que solo sabe fallar.
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: enCurso,
      isCreator: false,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      cancelMatch: vi.fn(),
      refetch: vi.fn(),
    });
    renderPage();

    await screen.findByTestId('quick-match-scoring-tabs');
    expect(screen.queryByTestId('quick-match-cancel-button')).not.toBeInTheDocument();
  });

  it('asks first, and says that it affects the whole group', async () => {
    comoCreador();
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));

    expect(screen.getByTestId('quick-match-cancel-body')).toHaveTextContent(
      'scoring.cancelMatch.confirmBody'
    );
  });

  it('does nothing until it is confirmed', async () => {
    const { cancelMatch } = comoCreador();
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    expect(cancelMatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    expect(cancelMatch).toHaveBeenCalledTimes(1);
  });

  it('stops accepting scores once the match is cancelled', async () => {
    // Sin esto la pantalla seguia editable y cada guardado se estrellaba contra
    // un 409 que se traduce como «vuelve a cargarla»; recargar no la resucita,
    // asi que el usuario se quedaba reintentando para siempre.
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: { ...enCurso, isCancelled: true },
      isCreator: true,
      isScorer: true,
      myParticipant: enCurso.participants[0],
      coveredParticipantIds: ['user-1'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      cancelMatch: vi.fn(),
      refetch: vi.fn(),
    });
    const { unmount } = renderPage();

    await screen.findByTestId('quick-match-scoring-tabs');
    // En modo lectura la casilla deja de ser un boton: no hay donde pulsar
    expect(screen.queryByTestId('quick-match-score-button-user-1')).not.toBeInTheDocument();
    unmount();

    // Y la misma partida sin cancelar si deja anotar, que si no esto pasaria
    // igual con la pantalla rota de cualquier otra forma
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: enCurso,
      isCreator: true,
      isScorer: true,
      myParticipant: enCurso.participants[0],
      coveredParticipantIds: ['user-1'],
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn(),
      cancelMatch: vi.fn(),
      refetch: vi.fn(),
    });
    renderPage();

    expect(await screen.findByTestId('quick-match-score-button-user-1')).toBeInTheDocument();
  });

  it('says on screen that the match is cancelled', async () => {
    // Los demas no vieron el aviso: se enteran por aqui cuando el sondeo traiga
    // el estado nuevo. Sin esto su pantalla quedaba igual que antes.
    comoCreador({ quickMatch: { ...enCurso, isCancelled: true } });
    renderPage();

    expect(await screen.findByTestId('quick-match-cancelled-badge')).toBeInTheDocument();
  });

  it('keeps the dialog open when cancelling fails', async () => {
    // Cerrandolo pase lo que pase, un fallo dejaba al usuario delante de la
    // misma pantalla, con los botones intactos y sin saber que no se cancelo.
    const cancelMatch = vi.fn().mockResolvedValue({ ok: false });
    mockUseQuickMatchScoring.mockReturnValue({
      ...baseHookState,
      quickMatch: enCurso,
      isCreator: true,
      setCurrentHole: vi.fn(),
      submitScore: vi.fn(),
      completeMatch: vi.fn().mockResolvedValue({ ok: true }),
      cancelMatch,
      refetch: vi.fn(),
    });
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });

    expect(screen.getByTestId('quick-match-cancel-confirm')).toBeInTheDocument();
    // Y con un aviso propio: el general habla de anotar y ademas queda detras
    // del velo del dialogo, fuera de la vista
    // Exacto: `toHaveTextContent` casa por subcadena, y con «failed» a secas
    // este test pasaba tambien con `failedServer` y `failedOffline` —que es lo
    // que de verdad salia aqui—.
    expect(screen.getByTestId('quick-match-cancel-error').textContent).toBe(
      'scoring.cancelMatch.failedServer'
    );
  });

  it('blames the connection, not another device, when there is no 409', async () => {
    // «Puede que otro dispositivo ya la haya cerrado» es una explicacion
    // concreta y equivocada para el caso mas probable en un campo: sin
    // cobertura. Solo un 409 significa que ya estaba cerrada.
    const cancelMatch = vi.fn().mockResolvedValue({ ok: false, error: new Error('sin red') });
    comoCreador({ cancelMatch });
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });

    expect(screen.getByTestId('quick-match-cancel-error').textContent).toBe(
      'scoring.cancelMatch.failedOffline'
    );
  });

  it('says it was already closed when the server answers 409', async () => {
    const conflicto = new Error('conflicto');
    conflicto.status = 409;
    const cancelMatch = vi.fn().mockResolvedValue({ ok: false, error: conflicto });
    comoCreador({ cancelMatch });
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });

    expect(screen.getByTestId('quick-match-cancel-error').textContent).toBe(
      'scoring.cancelMatch.failed'
    );
  });

  it('leaves the focus somewhere usable after cancelling', async () => {
    // El boton que abrio el aviso desaparece al cancelar de verdad, asi que
    // devolver el foco «a donde estaba» lo mandaba a un nodo desmontado y de
    // ahi al principio de la pagina.
    // Al cancelarse de verdad la partida pasa a CANCELLED y el boton desaparece,
    // que es justo lo que deja el foco huerfano. Con un mock fijo eso no pasa.
    const cancelMatch = vi.fn(() => {
      mockUseQuickMatchScoring.mockReturnValue({
        ...baseHookState,
        quickMatch: { ...enCurso, isCancelled: true },
        isCreator: true,
        setCurrentHole: vi.fn(),
        submitScore: vi.fn(),
        completeMatch: vi.fn().mockResolvedValue({ ok: true }),
        cancelMatch: vi.fn().mockResolvedValue({ ok: true }),
        refetch: vi.fn(),
      });
      return Promise.resolve({ ok: true });
    });
    comoCreador({ cancelMatch });
    renderPage();

    // Enfocar de verdad el boton: `fireEvent.click` no mueve el foco, y sin
    // esto el test pasaba por el foco que la pagina ponia al montarse, no por
    // lo que dice comprobar.
    const boton = await screen.findByTestId('quick-match-cancel-button');
    boton.focus();
    expect(document.activeElement).toBe(boton);

    fireEvent.click(boton);
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });

    expect(document.activeElement).toBe(screen.getByTestId('quick-match-scoring-tabs'));
  });

  it('does not touch the focus when the page just loads', async () => {
    // El efecto corre tambien al montar, con los dos avisos cerrados: si toca
    // el foco ahi, se lo lleva a las pestanas en cada carga de la pantalla.
    comoCreador();
    renderPage();

    await screen.findByTestId('quick-match-scoring-tabs');
    expect(document.activeElement).toBe(document.body);
  });

  it('blames the server, not the connection, on a 403 or a 404', async () => {
    // El backend usa 403 para «ya no eres quien la creo» y 404 para «esa
    // partida ya no existe»: mandar a mirar el wifi con buena cobertura deja al
    // usuario reintentando sin enterarse nunca del motivo.
    const prohibido = new Error('prohibido');
    prohibido.status = 403;
    const cancelMatch = vi.fn().mockResolvedValue({ ok: false, error: prohibido });
    comoCreador({ cancelMatch });
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });

    expect(screen.getByTestId('quick-match-cancel-error').textContent).toBe(
      'scoring.cancelMatch.failedServer'
    );
  });

  it('forgets the failure notice once the dialog is dismissed with Escape', async () => {
    // Si no, la proxima vez que abra el dialogo se lo encuentra ya con el error
    // de la vez anterior, sin haber confirmado nada.
    const cancelMatch = vi.fn().mockResolvedValue({ ok: false });
    comoCreador({ cancelMatch });
    renderPage();

    fireEvent.click(await screen.findByTestId('quick-match-cancel-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-match-cancel-confirm'));
    });
    expect(screen.getByTestId('quick-match-cancel-error')).toBeInTheDocument();

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    fireEvent.click(screen.getByTestId('quick-match-cancel-button'));

    expect(screen.queryByTestId('quick-match-cancel-error')).not.toBeInTheDocument();
  });

  it('keeps the finish dialog open and says so when finishing fails', async () => {
    // El hermano de al lado se quedaba peor que el nuevo: cerraba pasara lo que
    // pasara, y la partida seguia en curso sin que nadie dijera que fallo.
    const completeMatch = vi.fn().mockResolvedValue({ ok: false });
    comoCreador({ completeMatch });
    renderPage();

    fireEvent.click(await screen.findByText('scoring.finish.button'));
    await act(async () => {
      fireEvent.click(screen.getByText('scoring.finish.confirm'));
    });

    expect(screen.getByTestId('quick-match-finish-error')).toBeInTheDocument();
  });

  it('is gone once the match is already cancelled', async () => {
    comoCreador({ quickMatch: { ...enCurso, isCancelled: true } });
    renderPage();

    await screen.findByTestId('quick-match-scoring-tabs');
    expect(screen.queryByTestId('quick-match-cancel-button')).not.toBeInTheDocument();
  });
  describe('sin cobertura (FE #514)', () => {
    beforeEach(() => olvidaElEstadoDeConexion());

    it('no enseña el aviso mientras se llega al servidor', () => {
      renderPage();
      expect(screen.queryByTestId('quick-match-offline-banner')).not.toBeInTheDocument();
    });

    it('avisa en cuanto una petición deja de llegar', () => {
      renderPage();
      act(() => { apuntaFalloDeRed(); });
      expect(screen.getByTestId('quick-match-offline-banner')).toBeInTheDocument();
    });

    it('el aviso no promete guardar nada: aquí no hay cola', () => {
      // El texto de competición dice que se sincronizará al reconectar, y en
      // partida rápida eso sería mentira: el golpe se pierde
      renderPage();
      act(() => { apuntaFalloDeRed(); });
      const aviso = screen.getByTestId('quick-match-offline-banner');
      expect(aviso).toHaveAttribute('role', 'status');
      expect(aviso.textContent).toMatch(/scoring\.offline\.banner|no se guardar/i);
    });

    it('lo retira cuando el servidor vuelve a contestar', () => {
      renderPage();
      act(() => { apuntaFalloDeRed(); });
      act(() => { apuntaRespuestaDelServidor(); });
      expect(screen.queryByTestId('quick-match-offline-banner')).not.toBeInTheDocument();
    });
  });
});
