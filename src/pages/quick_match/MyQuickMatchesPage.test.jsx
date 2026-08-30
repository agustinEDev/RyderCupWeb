import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import MyQuickMatchesPage from './MyQuickMatchesPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Solo se interpola `value`, que es lo unico que se afirma por su numero
    t: (key, opts) => (opts?.value !== undefined ? `${key} ${opts.value}` : key),
    i18n: { language: 'en' },
  }),
}));

// El valor se define fuera para que su identidad sea estable entre renders,
// igual que en la app (viene de AuthContext). Si se crea un objeto nuevo en
// cada render, el efecto que depende de [user] recarga la lista sin parar.
const mockAuthValue = {
  user: { id: 'user-1', first_name: 'Test', last_name: 'User' },
  loading: false,
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockListMyQuickMatches = vi.fn();
const mockGetQuickMatch = vi.fn();
const mockGetGolfCourse = vi.fn();
const mockHideQuickMatch = vi.fn();
const mockExcludeFromStats = vi.fn();
const mockIncludeInStats = vi.fn();

vi.mock('../../composition', () => ({
  listMyQuickMatchesUseCase: { execute: (...args) => mockListMyQuickMatches(...args) },
  getQuickMatchUseCase: { execute: (...args) => mockGetQuickMatch(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetGolfCourse(...args) },
  hideQuickMatchUseCase: { execute: (...args) => mockHideQuickMatch(...args) },
  excludeQuickMatchFromStatsUseCase: { execute: (...args) => mockExcludeFromStats(...args) },
  includeQuickMatchInStatsUseCase: { execute: (...args) => mockIncludeInStats(...args) },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
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

  const matches = (overrides = {}) => ({
    quickMatches: [
      {
        id: 'qm-1',
        matchFormat: 'SINGLES',
        status: 'COMPLETED',
        createdAt: '2026-07-27T10:00:00Z',
        excludedFromStats: false,
        ...overrides,
      },
    ],
    totalCount: 1,
    page: 1,
    limit: 50,
  });

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

  // El control de navegar es una capa que cubre la tarjeta y ya no contiene el
  // texto, asi que sin `aria-label` propio se quedaria sin nombre accesible:
  // un lector de pantalla anunciaria «boton» a secas en cada partida.
  it('should give the row link an accessible name even though it holds no text', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-1', name: 'Sábado en Meis', matchFormat: 'SINGLES', status: 'IN_PROGRESS', createdAt: '2026-07-27T10:00:00Z' },
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

    expect(screen.getByTestId('quick-match-history-item-qm-1')).toHaveAttribute('aria-label', 'Sábado en Meis');
    // Sin nombre propio, el de la modalidad: el mismo texto que se ve.
    expect(screen.getByTestId('quick-match-history-item-qm-2')).toHaveAttribute('aria-label', 'history.format.FOURBALL');
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

  /**
   * El resultado de esta tarjeta es NETO y personal: se descuentan los golpes
   * que le tocan al jugador por SU hándicap de juego. La llamada al calculador
   * se había quedado con la firma vieja —le pasaba las salidas donde va el
   * reparto—, y como sin entrada para el participante se puntúa a bruto, la
   * lista contaba la vuelta contra el par del campo.
   */
  it("should subtract the player's own strokes from the to-par result", async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-3', golfCourseId: 'course-1', matchFormat: 'SINGLES', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });
    mockGetQuickMatch.mockResolvedValue({
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Test User', handicap: 2 }],
      holeScores: [
        { holeNumber: 1, participantId: 'user-1', score: 4 },
        { holeNumber: 2, participantId: 'user-1', score: 2 },
      ],
      effectiveAllowance: 100,
      playMode: 'HANDICAP',
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
      expect(screen.getByTestId('quick-match-result-qm-3')).toBeInTheDocument();
    });
    // Hándicap 2 sobre dos hoyos: un golpe en cada uno. Netos 3 + 1 = 4 sobre
    // un par jugado de 7, o sea tres bajo par. A bruto serían -1.
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  /**
   * En match play los golpes se dan por DIFERENCIA, así que el backend manda
   * cero para el jugador de hándicap más bajo. Esta tarjeta es el historial
   * personal, no el partido: usar ese reparto haría que la misma vuelta
   * contara distinto según con quién se jugó.
   */
  it("should ignore the match allocation and use the player's own handicap", async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-4', golfCourseId: 'course-1', matchFormat: 'SINGLES', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });
    mockGetQuickMatch.mockResolvedValue({
      participants: [
        { participantId: 'user-1', userId: 'user-1', name: 'Test User', handicap: 2 },
        { participantId: 'user-2', userId: 'user-2', name: 'Rival', handicap: 12 },
      ],
      holeScores: [
        { holeNumber: 1, participantId: 'user-1', score: 4 },
        { holeNumber: 2, participantId: 'user-1', score: 2 },
      ],
      // El reparto del partido: el de hándicap bajo no recibe ninguno
      participantStrokes: [
        { participantId: 'user-1', playingHandicap: 2, strokesByHole: {} },
        { participantId: 'user-2', playingHandicap: 12, strokesByHole: { 1: 1, 2: 1 } },
      ],
      effectiveAllowance: 100,
      playMode: 'HANDICAP',
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
      expect(screen.getByTestId('quick-match-result-qm-4')).toBeInTheDocument();
    });
    // Sus dos golpes siguen contando: -3. Con el reparto del partido saldría -1.
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  /**
   * En juego libre el backend aplica el allowance WHS de stroke play, el 95%
   * (`FREE_PLAY_ALLOWANCE`), asi que el reparto del partido NO es el mismo que
   * el del handicap de juego entero. Ensenando solo uno, esta tarjeta y la
   * pestana de clasificacion daban dos numeros distintos para la misma vuelta
   * sin que nada dijera por que. Se ensenan los dos, etiquetados.
   */
  it('should show the match figure next to the personal one in free play', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-6', golfCourseId: 'course-1', scoringFormat: 'MEDAL', status: 'COMPLETED', createdAt: '2026-07-21T10:00:00Z' },
      ],
      totalCount: 1,
      page: 1,
      limit: 50,
    });
    mockGetQuickMatch.mockResolvedValue({
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Test User', handicap: 12 }],
      holeScores: [
        { holeNumber: 1, participantId: 'user-1', score: 10 },
        { holeNumber: 2, participantId: 'user-1', score: 10 },
      ],
      // Al 95% el handicap de juego baja de 12 a 11, y se reparte distinto
      participantStrokes: [
        { participantId: 'user-1', playingHandicap: 11, strokesByHole: { 1: 6, 2: 5 } },
      ],
      effectiveAllowance: 95,
      playMode: 'HANDICAP',
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
      expect(screen.getByTestId('quick-match-result-qm-6')).toBeInTheDocument();
    });
    // Entero: el reparto local le da un golpe en cada hoyo -> netos 9 y 9
    // sobre un par jugado de 7 -> +11
    expect(screen.getByText('+11')).toBeInTheDocument();
    // Del partido: el reparto que mando el backend al 95% -> netos 4 y 5 -> +2
    expect(screen.getByTestId('quick-match-result-in-match-qm-6')).toHaveTextContent('+2');
  });

  /**
   * En foursomes la pareja juega una sola bola a golpes alternos: lo anotado es
   * del equipo, no la vuelta de nadie. Los golpes brutos sí son del equipo y la
   * tarjeta los enseñaba antes de esto: saltarse la partida entera la dejaba en
   * blanco, que es peor que no tocarla.
   */
  it('should show only the team gross strokes, and no to-par, for a foursomes match', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        { id: 'qm-5', golfCourseId: 'course-1', matchFormat: 'FOURSOMES', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
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
      effectiveAllowance: 50,
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
      expect(screen.getByTestId('quick-match-result-qm-5')).toBeInTheDocument();
    });
    expect(screen.getByText('history.grossStrokes')).toBeInTheDocument();
    // Etiquetados como del equipo: sin eso la tarjeta se queda en una línea
    // suelta de 10px y parece a medio pintar
    expect(screen.getByText('history.teamTotal')).toBeInTheDocument();
    // Ni la lectura personal ni la del partido: en foursomes no son de nadie
    expect(screen.queryByText('-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-result-in-match-qm-5')).not.toBeInTheDocument();
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

  it('un fallo del servidor se enseña con su mensaje', async () => {
    mockListMyQuickMatches.mockRejectedValue(Object.assign(new Error('Server error'), { status: 500 }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('un fallo de red se dice como falta de señal, no como error', async () => {
    // Antes salía el mensaje crudo del fallo en rojo. Ahora puede haber además
    // partidas en pantalla, las últimas que se vieron: llamarlo error sobre
    // una lista que se está usando es contradecirse
    mockListMyQuickMatches.mockRejectedValue(new TypeError('Failed to fetch'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('quick-matches-sin-conexion')).toBeInTheDocument();
    });
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('un fallo del código NO se disfraza de falta de señal', async () => {
    // Un mapeador que revienta con un dato inesperado también llega sin
    // estado. Decir «sin conexión» ahí esconde un defecto de verdad, y quien
    // lo reporte contará algo que no pasó
    mockListMyQuickMatches.mockRejectedValue(new Error('cannot read x of undefined'));

    renderPage();

    expect(await screen.findByText('cannot read x of undefined')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-matches-sin-conexion')).not.toBeInTheDocument();
  });

  describe('leaving a match out of the statistics', () => {

    it('shows an open eye on a match that counts', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches());

      renderPage();

      const eye = await screen.findByTestId('quick-match-stats-toggle-qm-1');
      expect(eye).toHaveAttribute('aria-pressed', 'false');
      // El estado se anuncia con palabras, no solo con el icono ni con el color
      expect(eye).toHaveAttribute('aria-label', 'history.countsInStats');
      expect(screen.queryByTestId('quick-match-excluded-badge-qm-1')).not.toBeInTheDocument();
    });

    it('marks the row and the eye when the match does not count', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches({ excludedFromStats: true }));

      renderPage();

      const eye = await screen.findByTestId('quick-match-stats-toggle-qm-1');
      expect(eye).toHaveAttribute('aria-pressed', 'true');
      expect(eye).toHaveAttribute('aria-label', 'history.excludedFromStats');
      // La etiqueta es lo que lo dice de verdad: el fondo no lo lee nadie
      expect(screen.getByTestId('quick-match-excluded-badge-qm-1')).toBeInTheDocument();
    });

    it('does not label a cancelled match as not counting', async () => {
      // La migracion dejo la marca puesta en partidas canceladas, que no
      // puntuan nunca: ahi la etiqueta no dice nada y, sin ojo, tampoco se
      // podia quitar.
      mockListMyQuickMatches.mockResolvedValue(
        matches({ status: 'CANCELLED', excludedFromStats: true })
      );

      renderPage();

      await screen.findByTestId('quick-match-history-item-qm-1');
      expect(screen.queryByTestId('quick-match-excluded-badge-qm-1')).not.toBeInTheDocument();
      // Ni la etiqueta ni el gris: una tarjeta apagada sin nada que lo
      // explique es peor que no marcarla
      expect(screen.getByTestId('quick-match-row-qm-1').className).not.toContain('bg-gray-50');
    });

    it('does label a match still in play that will not count', async () => {
      // La migracion pudo dejar la marca puesta en una partida sin terminar, y
      // ahi si significa algo: cuando la vuelta acabe, no contara. El ojo para
      // quitarla no aparece hasta que termine, pero enterarse entonces —al
      // recargar el historial y ver la etiqueta salir de la nada— es peor.
      mockListMyQuickMatches.mockResolvedValue(
        matches({ status: 'IN_PROGRESS', excludedFromStats: true })
      );

      renderPage();

      await screen.findByTestId('quick-match-history-item-qm-1');
      expect(screen.getByTestId('quick-match-excluded-badge-qm-1')).toBeInTheDocument();
      // El gris viaja con la etiqueta, nunca por su cuenta
      expect(screen.getByTestId('quick-match-row-qm-1').className).toContain('bg-gray-50');
    });

    it('does not offer the eye on a match still being played', async () => {
      // Todavia no cuenta en ninguna estadistica: el control no diria nada, y
      // el servidor lo rechaza con un 409
      mockListMyQuickMatches.mockResolvedValue(matches({ status: 'IN_PROGRESS' }));

      renderPage();

      await screen.findByTestId('quick-match-history-item-qm-1');
      expect(screen.queryByTestId('quick-match-stats-toggle-qm-1')).not.toBeInTheDocument();
    });

    it('leaves it out of the stats and repaints the row without reloading', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches());
      mockExcludeFromStats.mockResolvedValue({ id: 'qm-1', excludedFromStats: true });

      renderPage();

      fireEvent.click(await screen.findByTestId('quick-match-stats-toggle-qm-1'));

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-excluded-badge-qm-1')).toBeInTheDocument();
      });
      expect(mockExcludeFromStats).toHaveBeenCalledWith('qm-1');
      // La partida NO se va de la lista: eso es la papelera, no el ojo
      expect(screen.getByTestId('quick-match-history-item-qm-1')).toBeInTheDocument();
    });

    it('brings it back into the stats when pressed again', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches({ excludedFromStats: true }));
      mockIncludeInStats.mockResolvedValue({ id: 'qm-1', excludedFromStats: false });

      renderPage();

      fireEvent.click(await screen.findByTestId('quick-match-stats-toggle-qm-1'));

      await waitFor(() => {
        expect(screen.queryByTestId('quick-match-excluded-badge-qm-1')).not.toBeInTheDocument();
      });
      expect(mockIncludeInStats).toHaveBeenCalledWith('qm-1');
    });

    it('keeps the previous state when the request fails', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches());
      mockExcludeFromStats.mockRejectedValue(new Error('boom'));

      renderPage();

      fireEvent.click(await screen.findByTestId('quick-match-stats-toggle-qm-1'));

      await waitFor(() => {
        expect(mockExcludeFromStats).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('quick-match-excluded-badge-qm-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('quick-match-stats-toggle-qm-1')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it('does not navigate to scoring when the eye is pressed', async () => {
      mockListMyQuickMatches.mockResolvedValue(matches());
      mockExcludeFromStats.mockResolvedValue({ id: 'qm-1', excludedFromStats: true });

      renderPage();

      fireEvent.click(await screen.findByTestId('quick-match-stats-toggle-qm-1'));

      await waitFor(() => {
        expect(mockExcludeFromStats).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('hiding a match from the history', () => {
    const twoMatches = {
      quickMatches: [
        { id: 'qm-1', matchFormat: 'SINGLES', status: 'COMPLETED', createdAt: '2026-07-27T10:00:00Z' },
        { id: 'qm-2', matchFormat: 'FOURBALL', status: 'COMPLETED', createdAt: '2026-07-20T10:00:00Z' },
      ],
      totalCount: 2,
      page: 1,
      limit: 50,
    };

    it('should show a hide button on every card', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });
      expect(screen.getByTestId('quick-match-hide-qm-2')).toBeInTheDocument();
    });

    // La papelera ya no oculta directamente: abre un aviso, porque no se puede
    // deshacer desde la aplicación. Pulsarla y aceptar es ahora el gesto.
    const confirmarQuitar = async (id) => {
      fireEvent.click(screen.getByTestId(`quick-match-hide-${id}`));
      const confirmar = await screen.findByRole('button', { name: 'history.deleteConfirm' });
      fireEvent.click(confirmar);
    };

    it.each([['IN_PROGRESS'], ['PENDING']])(
      'warns that the others keep playing when the %s match is still alive',
      async (status) => {
      // «Se va tal y como esta» sugiere que la partida se congela, y no: los
      // demas siguen anotandola y el unico que la pierde es el que la quita
      // —con ella se va su unico acceso a la pantalla de anotacion—.
        mockListMyQuickMatches.mockResolvedValue(matches({ status }));

        renderPage();
        fireEvent.click(await screen.findByTestId('quick-match-hide-qm-1'));

        expect(screen.getByText(/history.deleteBodyInPlay/)).toBeInTheDocument();
        expect(screen.queryByText(/history.deleteHint/)).not.toBeInTheDocument();
      }
    );

    it('warns plainly on a cancelled match, which is over and never counted', async () => {
        // Ninguna de las dos existe ahi: no cuenta en ninguna estadistica y no
        // hay ojo. Y una cancelada SI esta terminada, asi que tampoco vale
        // decirle que no lo esta.
      mockListMyQuickMatches.mockResolvedValue(matches({ status: 'CANCELLED' }));

      renderPage();
      fireEvent.click(await screen.findByTestId('quick-match-hide-qm-1'));

      expect(screen.getByText(/history.deleteBodyPlain/)).toBeInTheDocument();
      expect(screen.queryByText(/history.deleteHint/)).not.toBeInTheDocument();
    });

    it('does not repeat the eye advice to someone who already used it', async () => {
      // Ya la dejo fuera de sus estadisticas: decirle que al quitarla «tambien
      // dejara de contar», y mandarle a usar el ojo, es contarle como novedad
      // lo que acaba de hacer.
      mockListMyQuickMatches.mockResolvedValue(
        matches({ status: 'COMPLETED', excludedFromStats: true })
      );

      renderPage();
      fireEvent.click(await screen.findByTestId('quick-match-hide-qm-1'));

      expect(screen.queryByText(/history.deleteHint/)).not.toBeInTheDocument();
      expect(screen.getByText(/history.deleteBodyPlain/)).toBeInTheDocument();
    });

    it('keeps the usual warning, with the eye, on a finished match', async () => {
      // La otra rama del ternario: sin esto nadie prueba que una terminada
      // sigue viendo el aviso de siempre. Se comprueba con `deleteHint`, que
      // es la unica clave que no es prefijo de otra.
      mockListMyQuickMatches.mockResolvedValue(matches({ status: 'COMPLETED' }));

      renderPage();
      fireEvent.click(await screen.findByTestId('quick-match-hide-qm-1'));

      expect(screen.getByText(/history.deleteHint/)).toBeInTheDocument();
    });

    it('should ask before removing, and do nothing if you cancel', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quick-match-hide-qm-1'));

      const cancelar = await screen.findByRole('button', { name: 'history.deleteCancel' });
      fireEvent.click(cancelar);

      expect(mockHideQuickMatch).not.toHaveBeenCalled();
      expect(screen.getByTestId('quick-match-history-item-qm-1')).toBeInTheDocument();
    });

    it('should hide the match and remove only that card from the list', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);
      mockHideQuickMatch.mockResolvedValue({ id: 'qm-1' });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      await confirmarQuitar('qm-1');

      await waitFor(() => {
        expect(screen.queryByTestId('quick-match-history-item-qm-1')).not.toBeInTheDocument();
      });
      expect(mockHideQuickMatch).toHaveBeenCalledWith('qm-1');
      // La otra partida no se toca: ocultar es por usuario y por partida.
      expect(screen.getByTestId('quick-match-history-item-qm-2')).toBeInTheDocument();
    });

    it('should not navigate to scoring when the hide button is clicked', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);
      mockHideQuickMatch.mockResolvedValue({ id: 'qm-1' });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      await confirmarQuitar('qm-1');

      await waitFor(() => {
        expect(mockHideQuickMatch).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should keep the card when hiding fails', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);
      mockHideQuickMatch.mockRejectedValue(new Error('Quick match not found'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      await confirmarQuitar('qm-1');

      await waitFor(() => {
        expect(mockHideQuickMatch).toHaveBeenCalledWith('qm-1');
      });
      expect(screen.getByTestId('quick-match-history-item-qm-1')).toBeInTheDocument();
    });

    it('should disable the button while the request is in flight', async () => {
      mockListMyQuickMatches.mockResolvedValue(twoMatches);
      let resolveHide;
      mockHideQuickMatch.mockReturnValue(new Promise((resolve) => { resolveHide = resolve; }));

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      await confirmarQuitar('qm-1');

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeDisabled();
      });
      // El resto de tarjetas siguen accionables mientras una se oculta.
      expect(screen.getByTestId('quick-match-hide-qm-2')).not.toBeDisabled();

      resolveHide({ id: 'qm-1' });
    });

    it('should keep a still-pending card disabled when another hide request finishes first', async () => {
      // Con un único hidingId, resolver qm-1 reactivaba el botón de qm-2 aunque
      // su petición siguiera en vuelo, permitiendo un segundo envío duplicado.
      mockListMyQuickMatches.mockResolvedValue(twoMatches);
      const resolvers = {};
      mockHideQuickMatch.mockImplementation(
        (id) => new Promise((resolve) => { resolvers[id] = resolve; })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-1')).toBeInTheDocument();
      });

      await confirmarQuitar('qm-1');
      await confirmarQuitar('qm-2');

      await waitFor(() => {
        expect(screen.getByTestId('quick-match-hide-qm-2')).toBeDisabled();
      });

      resolvers['qm-1']({ id: 'qm-1' });

      await waitFor(() => {
        expect(screen.queryByTestId('quick-match-hide-qm-1')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('quick-match-hide-qm-2')).toBeDisabled();
      expect(mockHideQuickMatch).toHaveBeenCalledTimes(2);

      resolvers['qm-2']({ id: 'qm-2' });
    });
  });
});

/**
 * LA TABLA O — poder LLEGAR a la partida sin cobertura (FE #524).
 *
 * La pantalla de anotación ya sabe pintarse con lo último que se supo, pero si
 * la lista no carga no hay por dónde entrar en ella. Es el último tramo del
 * camino: abrir la aplicación → llegar a la partida → anotar.
 *
 *   caso                         | qué se ve
 *   -----------------------------|--------------------------------------
 *   carga bien                   | la lista, y se guarda
 *   sin señal, con lista guardada| las últimas que se vieron, con aviso
 *   sin señal, sin nada guardado | como antes
 *   el servidor dice 401 o 403   | no se usa lo guardado
 */
describe('MyQuickMatchesPage · llegar a la partida sin cobertura (FE #524, tabla O)', () => {
  const guardadas = [{
    id: 'qm-9', name: 'Meis Foursomes', status: 'IN_PROGRESS', matchFormat: 'FOURSOMES',
    golfCourseId: 'c-1', playedAt: '2026-08-29T10:00:00Z', excludedFromStats: false,
  }];

  beforeEach(() => {
    const almacen = new Map();
    globalThis.localStorage = {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
    };
    vi.clearAllMocks();
  });

  it('sin señal enseña las últimas partidas que se vieron', async () => {
    localStorage.setItem('rydercup-ultima-lista', JSON.stringify(guardadas));
    mockListMyQuickMatches.mockRejectedValue(new TypeError('Failed to fetch'));

    renderPage();

    expect(await screen.findByText('Meis Foursomes')).toBeInTheDocument();
    expect(screen.getByTestId('quick-matches-sin-conexion')).toBeInTheDocument();
  });

  it('al cargar bien, las guarda para la próxima vez', async () => {
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: guardadas, total: 1 });

    renderPage();
    await screen.findByText('Meis Foursomes');

    expect(JSON.parse(localStorage.getItem('rydercup-ultima-lista'))).toHaveLength(1);
  });

  it.each([[401], [403]])('un %i además BORRA lo guardado, no solo lo ignora', async (status) => {
    // No usarlo esta vez no basta: seguía ahí para el siguiente fallo de red,
    // y entonces sí se pintaba
    localStorage.setItem('rydercup-ultima-lista', JSON.stringify(guardadas));
    mockListMyQuickMatches.mockRejectedValue(Object.assign(new Error('fuera'), { status }));

    renderPage();
    await screen.findByText('fuera');

    expect(localStorage.getItem('rydercup-ultima-lista')).toBeNull();
  });

  it('un 403 del REFRESCO no borra nada: no es la respuesta de la lista', async () => {
    // Cuando el interceptor no consigue refrescar, propaga su propio error con
    // `.response` puesta a la respuesta de `/auth/refresh-token`. Un 403 ahí es
    // un caso en el que se decide a propósito NO tirar la sesión (FE #514), y
    // borrar se llevaría la partida que se está jugando, sin vuelta atrás
    localStorage.setItem('rydercup-ultima-lista', JSON.stringify(guardadas));
    mockListMyQuickMatches.mockRejectedValue(
      Object.assign(new Error('Failed to refresh token'), { response: { status: 403 } })
    );

    renderPage();
    await waitFor(() => expect(mockListMyQuickMatches).toHaveBeenCalled());

    expect(JSON.parse(localStorage.getItem('rydercup-ultima-lista'))).toHaveLength(1);
  });

  it('una respuesta que llega tras cerrar sesión no vuelve a guardar nada', async () => {
    // El cierre de sesión acaba de borrarlo; si esta respuesta lo repusiera,
    // quedarían para la siguiente carga sin cobertura de OTRA cuenta
    let contesta;
    mockListMyQuickMatches.mockImplementation(() => new Promise((r) => { contesta = r; }));

    const { unmount } = renderPage();
    unmount();
    await act(async () => { contesta({ quickMatches: guardadas, total: 1 }); });

    expect(localStorage.getItem('rydercup-ultima-lista')).toBeNull();
  });

  it('con la sesión caducada no enseña lo guardado', async () => {
    // Un 401 desmiente: enseñar sus partidas a quien la aplicación no sabe
    // quién es no procede
    localStorage.setItem('rydercup-ultima-lista', JSON.stringify(guardadas));
    mockListMyQuickMatches.mockRejectedValue(Object.assign(new Error('fuera'), { status: 401 }));

    renderPage();

    // Se espera a que la pantalla haya reaccionado —el 401 sale con su mensaje—
    // y solo entonces se mira la ausencia: si no, la comprobación gana la
    // carrera y pasaría igual aunque la lista se pintara un instante después
    expect(await screen.findByText('fuera')).toBeInTheDocument();
    expect(screen.queryByText('Meis Foursomes')).not.toBeInTheDocument();
  });
});
