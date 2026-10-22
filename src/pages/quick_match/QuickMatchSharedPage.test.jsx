import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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
        <Route path="/quick-matches/:quickMatchId/shared" element={<QuickMatchSharedPage />} />
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
    expect(botones.every((id) => id?.startsWith('quick-match-tab-'))).toBe(true);
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

  it('the course failing is a failure too, with retry', async () => {
    getCourse.mockRejectedValueOnce(error(500));
    pinta();

    fireEvent.click(await screen.findByTestId('quick-match-shared-retry'));
    expect(await screen.findByTestId('quick-match-classification-table')).toBeInTheDocument();
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
});
