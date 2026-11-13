import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';

/**
 * La partida compartida, cuando lo que se pidió llega tarde (T5): al salir o
 * al pasar a otra partida, lo de antes ya no avisa, no navega y no se pinta.
 * Y cambiar de idioma no la vuelve a pedir.
 */
// El idioma se cambia desde el test: `t` antepone el idioma a la clave
const idioma = vi.hoisted(() => ({ actual: 'es' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => `${idioma.actual}:${key}`,
    i18n: { language: idioma.actual },
  }),
}));

vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

const toastInfo = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { info: (...a) => toastInfo(...a), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

const getShared = vi.fn();
const getCourse = vi.fn();
vi.mock('../../composition', () => ({
  getSharedQuickMatchUseCase: { execute: (...a) => getShared(...a) },
  getGolfCourseUseCase: { execute: (...a) => getCourse(...a) },
}));

const { default: QuickMatchSharedPage } = await import('./QuickMatchSharedPage');

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

// Un botón fuera de la pantalla para irse a otra ruta sin desmontar el router
let irA;
const Navegador = () => {
  irA = useNavigate();
  return null;
};

const pinta = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/quick-matches/qm-1/shared', state }]}>
      <Navegador />
      <Routes>
        <Route path="/quick-matches/:quickMatchId/shared" element={<QuickMatchSharedPage />} />
        <Route path="*" element={<Donde />} />
      </Routes>
    </MemoryRouter>
  );

const error = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('QuickMatchSharedPage · lo que llega tarde (T5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idioma.actual = 'es';
    getShared.mockResolvedValue(compartida());
    getCourse.mockResolvedValue({ name: 'El Saler', holes: hoyos, tees: [] });
  });

  it.each([
    ['T5-13: desde una tarjeta de Actividad', { perfilDe: 'u2' }],
    ['T5-13b: desde el perfil del amigo', { perfilDe: 'u2', desdeSuPerfil: true }],
  ])('%s, el 403 que llega tras salir ni avisa ni lleva al perfil', async (_caso, state) => {
    let fallar;
    getShared.mockImplementation(() => new Promise((_, reject) => { fallar = () => reject(error(403)); }));
    pinta(state);
    await waitFor(() => expect(fallar).toBeTypeOf('function'));

    await act(async () => {
      irA('/feed');
    });
    await act(async () => {
      fallar();
      await Promise.resolve();
    });

    expect(toastInfo).not.toHaveBeenCalled();
    expect(screen.getByTestId('donde')).toHaveTextContent('/feed');
  });

  it('T5-14: el campo de la partida anterior que llega tarde no se pinta en la nueva', async () => {
    getShared.mockImplementation(async (id) =>
      compartida({ id, golfCourseId: id === 'qm-1' ? 'course-1' : 'course-2' })
    );
    let darElViejo;
    getCourse.mockImplementation((id) =>
      id === 'course-1'
        ? new Promise((resolve) => { darElViejo = () => resolve({ name: 'Campo viejo', holes: hoyos, tees: [] }); })
        : Promise.resolve({ name: 'Campo nuevo', holes: hoyos, tees: [] })
    );
    pinta();
    await waitFor(() => expect(getCourse).toHaveBeenCalledWith('course-1'));

    await act(async () => {
      irA('/quick-matches/qm-2/shared');
    });
    expect(await screen.findByText('Campo nuevo')).toBeInTheDocument();
    await act(async () => {
      darElViejo();
      await Promise.resolve();
    });

    expect(screen.queryByText('Campo viejo')).not.toBeInTheDocument();
    expect(screen.getByText('Campo nuevo')).toBeInTheDocument();
  });

  it('T5-14b: y si ese campo anterior falla mientras llega el nuevo, la nueva no enseña el error del campo', async () => {
    getShared.mockImplementation(async (id) =>
      compartida({ id, golfCourseId: id === 'qm-1' ? 'course-1' : 'course-2' })
    );
    let fallarElViejo;
    let darElNuevo;
    getCourse.mockImplementation((id) =>
      id === 'course-1'
        ? new Promise((_, reject) => { fallarElViejo = () => reject(error(500)); })
        : new Promise((resolve) => { darElNuevo = () => resolve({ name: 'Campo nuevo', holes: hoyos, tees: [] }); })
    );
    pinta();
    await waitFor(() => expect(getCourse).toHaveBeenCalledWith('course-1'));

    await act(async () => {
      irA('/quick-matches/qm-2/shared');
    });
    await waitFor(() => expect(getCourse).toHaveBeenCalledWith('course-2'));
    await act(async () => {
      fallarElViejo();
      await Promise.resolve();
    });

    expect(screen.queryByTestId('quick-match-shared-course-error')).not.toBeInTheDocument();
    await act(async () => {
      darElNuevo();
      await Promise.resolve();
    });
    expect(await screen.findByText('Campo nuevo')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-classification-table')).toBeInTheDocument();
  });

  it('a quien la jugó se le lleva a su anotación sin pedir el campo', async () => {
    getShared.mockResolvedValue(compartida({ viewerIsParticipant: true }));
    pinta();

    expect(await screen.findByTestId('donde')).toHaveTextContent('/quick-matches/qm-1/scoring');
    expect(getCourse).not.toHaveBeenCalled();
  });

  it('T5-15: un fallo cualquiera, «Reintentar» enseña la espera y luego la partida', async () => {
    getShared.mockRejectedValueOnce(error(500));
    let devolver;
    pinta();
    const reintentar = await screen.findByTestId('quick-match-shared-retry');
    getShared.mockImplementationOnce(() => new Promise((resolve) => { devolver = () => resolve(compartida()); }));

    fireEvent.click(reintentar);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-shared-retry')).not.toBeInTheDocument();
    await act(async () => {
      devolver();
      await Promise.resolve();
    });

    expect(await screen.findByTestId('quick-match-classification-table')).toBeInTheDocument();
    expect(getShared).toHaveBeenCalledTimes(2);
  });

  it('T5-16: cambiar de idioma cambia los textos y no la vuelve a pedir', async () => {
    const { rerender } = pinta();
    expect(await screen.findByText('Viernes')).toBeInTheDocument();
    expect(screen.getByText('es:scoring.matchHeader', { exact: false })).toBeInTheDocument();

    idioma.actual = 'en';
    rerender(
      <MemoryRouter initialEntries={[{ pathname: '/quick-matches/qm-1/shared' }]}>
        <Navegador />
        <Routes>
          <Route path="/quick-matches/:quickMatchId/shared" element={<QuickMatchSharedPage />} />
          <Route path="*" element={<Donde />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('en:scoring.matchHeader', { exact: false })).toBeInTheDocument();
    expect(getShared).toHaveBeenCalledTimes(1);
    expect(getCourse).toHaveBeenCalledTimes(1);
  });

  it('T5-16b: un cambio solo del estado de la navegación, en la misma URL, no la vuelve a pedir', async () => {
    pinta({ perfilDe: 'u2' });
    expect(await screen.findByText('Viernes')).toBeInTheDocument();

    await act(async () => {
      irA('/quick-matches/qm-1/shared', { state: { perfilDe: 'u9', desdeSuPerfil: true } });
    });

    expect(screen.getByText('Viernes')).toBeInTheDocument();
    expect(getShared).toHaveBeenCalledTimes(1);
  });
});
