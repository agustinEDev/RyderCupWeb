import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router';
import QuickMatchSharedPage from './QuickMatchSharedPage';
import es from '../../i18n/locales/es/quickMatch.json';
import en from '../../i18n/locales/en/quickMatch.json';
import commonEs from '../../i18n/locales/es/common.json';
import commonEn from '../../i18n/locales/en/common.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts?.value !== undefined ? `${key} ${opts.value}` : key),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

// La pantalla de solo lectura no anota: si tocara el hook de anotación (con su
// sondeo y su cola sin conexión), este test lo diría
vi.mock('../../hooks/useQuickMatchScoring', () => ({
  useQuickMatchScoring: () => {
    throw new Error('read-only must not use the scoring hook');
  },
}));

const toastInfo = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { info: (...a) => toastInfo(...a), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

const getShared = vi.fn();
const getCourse = vi.fn();
const getQuickMatch = vi.fn();
const submit = vi.fn();
vi.mock('../../composition', () => ({
  getSharedQuickMatchUseCase: { execute: (...a) => getShared(...a) },
  getGolfCourseUseCase: { execute: (...a) => getCourse(...a) },
  getQuickMatchUseCase: { execute: (...a) => getQuickMatch(...a) },
  submitQuickMatchHoleScoreUseCase: { execute: (...a) => submit(...a) },
  submitQuickMatchProxyHoleScoreUseCase: { execute: (...a) => submit(...a) },
}));

const hoyos = [
  { holeNumber: 1, par: 4, strokeIndex: 1 },
  { holeNumber: 2, par: 3, strokeIndex: 2 },
];

const compartida = (overrides = {}) => ({
  id: 'qm-1',
  name: 'Viernes',
  golfCourseId: 'course-1',
  matchFormat: null,
  scoringFormat: 'STABLEFORD',
  playMode: 'SCRATCH',
  effectiveAllowance: 100,
  status: 'COMPLETED',
  isCompleted: true,
  isCancelled: false,
  participants: [
    { participantId: 'p-1', userId: 'u2', name: 'Pedro', handicap: 10, isGuest: false },
    { participantId: 'p-2', userId: null, name: null, handicap: null, isGuest: true },
    { participantId: 'p-3', userId: 'u9', name: null, handicap: 3, isGuest: false },
  ],
  holeScores: [
    { holeNumber: 1, participantId: 'p-1', score: 4 },
    { holeNumber: 1, participantId: 'p-2', score: 6 },
    { holeNumber: 1, participantId: 'p-3', score: 5 },
  ],
  participantStrokes: [],
  standing: null,
  scoringAssignments: [{ scorerParticipantId: 'p-1', scorerName: null, coveredParticipantIds: ['p-1'] }],
  readOnly: true,
  viewerIsParticipant: false,
  ...overrides,
});

const Donde = () => {
  const { pathname } = useLocation();
  return <p data-testid="donde">{pathname}</p>;
};

const pinta = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/quick-matches/qm-1/shared', state }]}>
      <Routes>
        <Route
          path="/quick-matches/:quickMatchId/shared"
          element={
            <>
              <span data-testid="donde-sigue" />
              <QuickMatchSharedPage />
            </>
          }
        />
        <Route path="*" element={<Donde />} />
      </Routes>
    </MemoryRouter>
  );

const error = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('QuickMatchSharedPage — a friend\'s finished quick match, read-only (K)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getShared.mockResolvedValue(compartida());
    getCourse.mockResolvedValue({ name: 'El Saler', holes: hoyos, tees: [] });
  });

  it('asks the shared endpoint and the course, never the scoring detail', async () => {
    pinta();

    await screen.findByTestId('quick-match-classification-table');
    expect(getShared).toHaveBeenCalledWith('qm-1');
    expect(getCourse).toHaveBeenCalledWith('course-1');
    expect(getQuickMatch).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows the classification and the scorecard, with the course and a read-only label', async () => {
    pinta();

    const tabla = await screen.findByTestId('quick-match-classification-table');
    expect(within(tabla).getByText('Pedro')).toBeInTheDocument();
    expect(screen.getByText('El Saler')).toBeInTheDocument();
    expect(screen.getByText('Viernes')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-shared-read-only')).toHaveTextContent('shared.readOnly');

    fireEvent.click(screen.getByTestId('quick-match-tab-scorecard'));
    expect(await screen.findByTestId('quick-match-shared-scorecard')).toBeInTheDocument();
  });

  it('a nameless guest reads «un invitado» and a nameless player «un jugador»', async () => {
    pinta();

    const tabla = await screen.findByTestId('quick-match-classification-table');
    expect(within(tabla).getByText('shared.guest')).toBeInTheDocument();
    expect(within(tabla).getByText('shared.player')).toBeInTheDocument();
    expect(es.shared.guest).toBe('un invitado');
    expect(es.shared.player).toBe('un jugador');
    expect(en.shared.guest).toBe('a guest');
    expect(en.shared.player).toBe('a player');
  });

  it('nothing to score, edit or act on: no input tab, no hole input, no finish or cancel', async () => {
    pinta();

    await screen.findByTestId('quick-match-classification-table');
    expect(screen.queryByTestId('quick-match-tab-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-match-tab-classification')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-tab-scorecard')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-hole-input')).not.toBeInTheDocument();
    expect(screen.queryByText('scoring.finish.button')).not.toBeInTheDocument();
    expect(screen.queryByText('scoring.cancel.button')).not.toBeInTheDocument();
    const botones = [...document.querySelectorAll('button')].map((b) => b.getAttribute('data-testid'));
    expect(botones.length).toBeGreaterThan(0);
    expect(
      botones.every((id) => id?.startsWith('quick-match-tab-') || id === 'quick-match-shared-back')
    ).toBe(true);
    expect(document.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });

  it('marks the result as final', async () => {
    pinta();
    const tabla = await screen.findByTestId('quick-match-classification-table');
    expect(within(tabla).getAllByText('scoring.classification.finishedBadge').length).toBeGreaterThan(0);
  });

  it('who played it goes to their own scoring screen', async () => {
    getShared.mockResolvedValue(compartida({ viewerIsParticipant: true }));
    pinta();

    expect(await screen.findByTestId('donde')).toHaveTextContent('/quick-matches/qm-1/scoring');
  });

  it('a 403 coming from a friend card goes to that friend profile with a soft notice', async () => {
    getShared.mockRejectedValue(error(403));
    pinta({ perfilDe: 'u2' });

    expect(await screen.findByTestId('donde')).toHaveTextContent('/players/u2');
    expect(toastInfo).toHaveBeenCalledWith('shared.forbiddenToast');
    expect(getCourse).not.toHaveBeenCalled();
  });

  it('a 403 with no friend to go back to says it cannot be seen', async () => {
    getShared.mockRejectedValue(error(403));
    pinta();

    expect(await screen.findByTestId('quick-match-shared-forbidden')).toHaveTextContent('shared.forbidden');
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('a 404 says it was not found', async () => {
    getShared.mockRejectedValue(error(404));
    pinta({ perfilDe: 'u2' });

    expect(await screen.findByTestId('quick-match-shared-not-found')).toHaveTextContent('scoring.errors.notFound');
  });

  it('any other failure offers to retry, and retrying loads it', async () => {
    getShared.mockRejectedValueOnce(error(500));
    pinta();

    fireEvent.click(await screen.findByTestId('quick-match-shared-retry'));

    expect(await screen.findByTestId('quick-match-classification-table')).toBeInTheDocument();
    expect(getShared).toHaveBeenCalledTimes(2);
  });

  describe('the course failing is not the match failing (review)', () => {
    it.each([403, 404, 500])(
      'a %s on the course still paints the match, with a generic course error and retry',
      async (status) => {
        getCourse.mockRejectedValueOnce(error(status));
        pinta({ perfilDe: 'u2' });

        expect(await screen.findByText('Viernes')).toBeInTheDocument();
        expect(screen.getByTestId('quick-match-shared-read-only')).toBeInTheDocument();
        expect(screen.queryByTestId('campo-de-la-partida')).not.toBeInTheDocument();
        // Nunca un error de partida, ni la salida al perfil
        expect(screen.getByTestId('donde-sigue')).toBeInTheDocument();
        expect(toastInfo).not.toHaveBeenCalled();
        expect(screen.queryByTestId('quick-match-shared-forbidden')).not.toBeInTheDocument();
        expect(screen.queryByTestId('quick-match-shared-not-found')).not.toBeInTheDocument();
        expect(screen.queryByText('shared.forbidden')).not.toBeInTheDocument();
        expect(screen.queryByText('scoring.errors.notFound')).not.toBeInTheDocument();

        // Stroke play: la clasificación necesita los hoyos del campo
        const aviso = screen.getByTestId('quick-match-shared-course-error');
        expect(aviso).toHaveTextContent('scoring.errors.generic');
        expect(screen.queryByTestId('quick-match-classification-table')).not.toBeInTheDocument();

        fireEvent.click(within(aviso).getByTestId('quick-match-shared-course-retry'));

        expect(await screen.findByTestId('quick-match-classification-table')).toBeInTheDocument();
        expect(screen.getByText('El Saler')).toBeInTheDocument();
        expect(getShared).toHaveBeenCalledTimes(1);
        expect(getCourse).toHaveBeenCalledTimes(2);
      }
    );

    it('the scorecard also says the course failed, with retry', async () => {
      getCourse.mockRejectedValueOnce(error(404));
      pinta();

      await screen.findByText('Viernes');
      fireEvent.click(screen.getByTestId('quick-match-tab-scorecard'));

      expect(await screen.findAllByTestId('quick-match-shared-course-error')).not.toHaveLength(0);
      expect(screen.queryByTestId('quick-match-shared-scorecard')).not.toBeInTheDocument();
    });

    it('match play still shows its standing without the course', async () => {
      getShared.mockResolvedValue(
        compartida({
          matchFormat: 'SINGLES',
          scoringFormat: null,
          participants: compartida().participants.slice(0, 2),
          standing: { status: '2', leadingTeam: 'A', holesPlayed: 18, holesRemaining: 0, isDecided: true },
        })
      );
      getCourse.mockRejectedValueOnce(error(403));
      pinta({ perfilDe: 'u2' });

      expect(await screen.findByTestId('quick-match-standing')).toBeInTheDocument();
      expect(toastInfo).not.toHaveBeenCalled();
    });
  });

  describe('«Volver» goes back where you came from (review)', () => {
    const conHistoria = () =>
      render(
        <MemoryRouter
          initialEntries={['/players/u2', { pathname: '/quick-matches/qm-1/shared', state: { perfilDe: 'u2' } }]}
          initialIndex={1}
        >
          <Routes>
            <Route path="/quick-matches/:quickMatchId/shared" element={<QuickMatchSharedPage />} />
            <Route path="*" element={<Donde />} />
          </Routes>
        </MemoryRouter>
      );

    it('with history, to the previous screen', async () => {
      conHistoria();

      fireEvent.click(await screen.findByTestId('quick-match-shared-back'));

      expect(await screen.findByTestId('donde')).toHaveTextContent('/players/u2');
    });

    it('without history, to Actividad', async () => {
      pinta();

      fireEvent.click(await screen.findByTestId('quick-match-shared-back'));

      expect(await screen.findByTestId('donde')).toHaveTextContent('/feed');
    });

    it('reads «Volver» / «Back»', async () => {
      pinta();
      expect(await screen.findByTestId('quick-match-shared-back')).toHaveTextContent('shared.back');
      expect(es.shared.back).toBe('Volver');
      expect(en.shared.back).toBe('Back');
    });

    it.each([
      ['a 404', 404, 'quick-match-shared-not-found'],
      ['a 403 with no friend', 403, 'quick-match-shared-forbidden'],
      ['a generic failure', 500, 'quick-match-shared-error'],
    ])('%s offers a way back too', async (_caso, status, testId) => {
      getShared.mockRejectedValueOnce(error(status));
      pinta();

      const aviso = await screen.findByTestId(testId);
      fireEvent.click(within(aviso).getByTestId('quick-match-shared-back'));

      expect(await screen.findByTestId('donde')).toHaveTextContent('/feed');
    });

    it('the generic failure keeps «Reintentar» next to the way back', async () => {
      getShared.mockRejectedValueOnce(error(500));
      pinta();

      const aviso = await screen.findByTestId('quick-match-shared-error');
      expect(within(aviso).getByTestId('quick-match-shared-retry')).toBeInTheDocument();
      expect(within(aviso).getByTestId('quick-match-shared-back')).toBeInTheDocument();
    });
  });

  it('has the same keys in Spanish and English, and the screen title', () => {
    const claves = (obj, prefijo = '') =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`]
      );
    expect(claves(en.shared).sort()).toEqual(claves(es.shared).sort());
    expect(es.shared.readOnly).toBe('Solo lectura');
    expect(en.shared.readOnly).toBe('Read only');
    expect(commonEs.screens.sharedQuickMatch).toBe('Partida rápida');
    expect(commonEn.screens.sharedQuickMatch).toBe('Quick match');
  });

  describe("a 403 coming from that same friend's profile (final review)", () => {
    const ComoSeLlego = () => {
      const { pathname } = useLocation();
      return <p data-testid="llegada">{`${pathname}|${useNavigationType()}`}</p>;
    };
    const desdeSuPerfil = (entradas, indice) =>
      render(
        <MemoryRouter initialEntries={entradas} initialIndex={indice}>
          <Routes>
            <Route path="/quick-matches/:quickMatchId/shared" element={<QuickMatchSharedPage />} />
            <Route path="*" element={<ComoSeLlego />} />
          </Routes>
        </MemoryRouter>
      );
    const compartidaDesdeSuPerfil = {
      pathname: '/quick-matches/qm-1/shared',
      state: { perfilDe: 'u2', desdeSuPerfil: true },
    };

    it('goes back to that profile (POP), not on top of it, with «No puedes ver esa partida»', async () => {
      getShared.mockRejectedValue(error(403));
      desdeSuPerfil(['/players/u2', compartidaDesdeSuPerfil], 1);

      expect(await screen.findByTestId('llegada')).toHaveTextContent('/players/u2|POP');
      expect(toastInfo).toHaveBeenCalledWith('shared.forbiddenBack');
      expect(toastInfo).not.toHaveBeenCalledWith('shared.forbiddenToast');
      expect(es.shared.forbiddenBack).toBe('No puedes ver esa partida.');
      expect(en.shared.forbiddenBack).toBe("You can't view that match.");
    });

    it('without a screen behind (opened directly), to that profile replacing this one', async () => {
      getShared.mockRejectedValue(error(403));
      desdeSuPerfil([compartidaDesdeSuPerfil], 0);

      expect(await screen.findByTestId('llegada')).toHaveTextContent('/players/u2|REPLACE');
      expect(toastInfo).toHaveBeenCalledWith('shared.forbiddenBack');
    });

    it('from Actividad it stays as it was: to the profile, replacing, «te llevamos a su perfil»', async () => {
      getShared.mockRejectedValue(error(403));
      desdeSuPerfil(['/feed', { pathname: '/quick-matches/qm-1/shared', state: { perfilDe: 'u2' } }], 1);

      expect(await screen.findByTestId('llegada')).toHaveTextContent('/players/u2|REPLACE');
      expect(toastInfo).toHaveBeenCalledWith('shared.forbiddenToast');
    });
  });
});
