/**
 * El paso 1 más sencillo, con la barra ya elegida (FE #1025). Tabla aprobada
 * por Agustín el 3 nov 2026 (P4 afinada ese mismo día):
 *
 *   #    caso                                       | qué pasa
 *   -----|-------------------------------------------|----------------------------------
 *   P1   orden                                      | campo → tu barra → ¿a qué jugáis?
 *        |                                           | → más opciones
 *   P2   ¿a qué jugáis?                             | un toque fija modalidad y formato;
 *        |                                           | el % sigue al formato
 *   P3   más opciones                               | plegado; lo que no es lo de por
 *        |                                           | defecto, en su cabecera
 *   P4   tu barra                                   | botones de tu género y las mixtas;
 *        |                                           | «Otras» abre el panel; la elegida
 *        |                                           | ahí se ve marcada
 *   P5   la que sale elegida                        | la de la última vez en ese campo;
 *        |                                           | si no, la de tu género; si no,
 *        |                                           | ninguna
 *   P6   otro campo                                 | se vuelve a calcular
 *   P7   repetir                                    | manda la copiada
 *   P8   un amigo (paso 2)                          | el panel trae marcada su última
 *   P10  campo sin barras                           | sin «Tu barra»
 *   P11  sin poder leer tus partidas                | la de tu género
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.current !== undefined ? `${key}_${params.current}_${params.total}` : key),
    i18n: { language: 'es' },
  }),
}));

const mockCampoElegido = vi.hoisted(() => ({ id: 'gc-1' }));
vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <button type="button" data-testid="select-course-stub" onClick={() => onCourseSelect({ id: mockCampoElegido.id, name: mockCampoElegido.id })}>
      Select course
    </button>
  ),
}));

const mockIniciar = vi.fn();
const mockListFriends = vi.fn();
const mockGetGolfCourse = vi.fn();
const mockListMine = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockIniciar(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listMyQuickMatchesUseCase: { execute: (...a) => mockListMine(...a) },
}));

const tee = (color, gender) => ({ color, gender });
const FEDERADO = [tee('WHITE', 'MALE'), tee('YELLOW', 'MALE'), tee('YELLOW', 'FEMALE'), tee('RED', 'FEMALE')];
const yo = (gender = 'MALE') => ({ id: 'yo', display_name: 'Yo', handicap: 12, gender });
const partidaEn = (golfCourseId, participants) => ({ id: `qm-${golfCourseId}`, golfCourseId, playedAt: '2026-10-01T10:00:00Z', participants });
const jugador = (userId, color, teeGender) => ({ userId, color, teeGender, isGuest: false });

const abre = (props = {}) =>
  render(
    <MemoryRouter>
      <CreateQuickMatchModal onClose={vi.fn()} onStarted={vi.fn()} currentUser={yo()} {...props} />
    </MemoryRouter>
  );

const eligeCampo = async (id = 'gc-1') => {
  mockCampoElegido.id = id;
  fireEvent.click(screen.getByTestId('select-course-stub'));
  await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalledWith(id));
  await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
};
const pulsada = (testId) => screen.getByTestId(testId).getAttribute('aria-pressed') === 'true';
const peticion = () => mockIniciar.mock.calls[0][0];
const hastaElResumen = async () => {
  // En individual hacen falta dos: para llegar al resumen solo, juego libre
  if (pulsada('format-option-SINGLES')) fireEvent.click(screen.getByTestId('scoring-format-option-STABLEFORD'));
  fireEvent.click(screen.getByTestId('quick-match-course-next'));
  await screen.findByTestId('quick-match-participants-next');
  fireEvent.click(screen.getByTestId('quick-match-participants-next'));
  fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
  fireEvent.click(await screen.findByTestId('quick-match-start'));
  await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
};

describe('CreateQuickMatchModal · paso 1 más sencillo (FE #1025)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampoElegido.id = 'gc-1';
    mockListFriends.mockResolvedValue({ friendships: [{ id: 'f-1', otherUserId: 'ana', otherUserName: 'Ana', otherUserHandicap: 20 }], totalCount: 1 });
    mockGetGolfCourse.mockImplementation((id) => Promise.resolve({ tees: id === 'gc-sin' ? [] : FEDERADO, isFromRfeg: () => false }));
    mockListMine.mockResolvedValue({ quickMatches: [] });
    mockIniciar.mockResolvedValue({ id: 'qm-nueva' });
  });

  it('P1: campo, tu barra, a qué jugáis y más opciones, en ese orden', async () => {
    abre();
    await eligeCampo();

    const orden = ['select-course-stub', 'quick-match-creator-tee-option-YELLOW|MALE', 'format-option-SINGLES', 'quick-match-mas-opciones'].map((id) => screen.getByTestId(id));
    for (let i = 1; i < orden.length; i += 1) {
      expect(orden[i - 1].compareDocumentPosition(orden[i]) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('P2: un toque fija modalidad y formato (y el % del formato)', async () => {
    abre();
    await eligeCampo();

    fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
    expect(pulsada('format-option-FOURBALL')).toBe(true);
    expect(pulsada('format-option-SINGLES')).toBe(false);

    fireEvent.click(screen.getByTestId('scoring-format-option-MEDAL'));
    expect(pulsada('scoring-format-option-MEDAL')).toBe(true);
    expect(pulsada('format-option-FOURBALL')).toBe(false);
    await hastaElResumen();
    expect(peticion()).toMatchObject({ matchFormat: null, scoringFormat: 'MEDAL', allowancePercentage: 95 });
  });

  it('P3: más opciones, plegado, y en su cabecera lo que no es lo de por defecto', async () => {
    abre();
    const mas = screen.getByTestId('quick-match-mas-opciones');
    expect(mas.open).toBe(false);
    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones');

    fireEvent.change(screen.getByTestId('quick-match-name-input'), { target: { value: 'Domingo' } });
    fireEvent.click(screen.getByTestId('quick-match-allowance-option-90'));

    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones · Domingo · 90%');
    fireEvent.click(screen.getByTestId('quick-match-play-mode-option-SCRATCH'));
    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones · Domingo · create.course.playModeScratch');
  });

  it('P4: las de tu género y las mixtas, a la vista; «Otras» para las demás, y la elegida ahí se ve', async () => {
    mockGetGolfCourse.mockResolvedValue({ tees: [...FEDERADO, tee('GREEN', null)], isFromRfeg: () => false });
    abre();
    await eligeCampo();

    const opciones = [...screen.getAllByTestId(/^quick-match-creator-tee-option-/)].map((b) => b.dataset.testid.replace('quick-match-creator-tee-option-', ''));
    expect(opciones).toEqual(['WHITE|MALE', 'YELLOW|MALE', 'GREEN|']);

    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE'));

    expect(pulsada('quick-match-creator-tee-option-RED|FEMALE')).toBe(true);
    await hastaElResumen();
    expect(peticion()).toMatchObject({ creatorTeeColor: 'RED', creatorTeeGender: 'FEMALE' });
  });

  it('P4: sin género en el perfil, el campo con el panel de siempre', async () => {
    abre({ currentUser: yo(null) });
    await eligeCampo();

    expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-creator-tee-otras')).not.toBeInTheDocument();
  });

  it('P5: la de la última vez en ese campo sale elegida, y viaja', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre();
    await eligeCampo();

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(true));
    await hastaElResumen();
    expect(peticion()).toMatchObject({ creatorTeeColor: 'WHITE', creatorTeeGender: 'MALE' });
  });

  it.each([
    ['hombre', 'MALE', 'YELLOW|MALE'],
    ['mujer', 'FEMALE', 'RED|FEMALE'],
  ])('P5: sin última vez, la de tu género (%s)', async (_, genero, clave) => {
    abre({ currentUser: yo(genero) });
    await eligeCampo();

    await waitFor(() => expect(pulsada(`quick-match-creator-tee-option-${clave}`)).toBe(true));
  });

  it('P6: otro campo, se vuelve a calcular', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre();
    await eligeCampo('gc-1');
    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(true));

    await eligeCampo('gc-2');

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
    expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(false);
  });

  it('P7: al repetir, manda la barra copiada', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre({
      borrador: {
        paso: 1,
        avisos: [],
        inicial: {
          matchName: '', mode: 'MATCH_PLAY', matchFormat: 'SINGLES', scoringFormat: 'STABLEFORD', allowanceOverride: null, playMode: 'HANDICAP',
          selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: 'YELLOW|FEMALE', participants: [], scorerIds: [],
        },
      },
    });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|FEMALE')).toBe(true));
    expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(false);
  });

  it('P8: al añadir un amigo, el panel trae marcada la barra que llevó allí la última vez', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'YELLOW', 'MALE'), jugador('ana', 'RED', 'FEMALE')])] });
    abre();
    await eligeCampo();
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    fireEvent.click(await screen.findByTestId('quick-match-add-friend-f-1'));

    expect(pulsada('quick-match-tee-panel-option-RED|FEMALE')).toBe(true);
    expect(pulsada('quick-match-tee-panel-option-YELLOW|MALE')).toBe(false);
  });

  it('P10: un campo sin barras, sin «Tu barra»', async () => {
    abre();
    await eligeCampo('gc-sin');

    expect(screen.queryByText('create.course.yourTeeLabel')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/quick-match-creator-tee/)).not.toBeInTheDocument();
  });

  it('P11: sin poder leer tus partidas, la de tu género', async () => {
    mockListMine.mockRejectedValue(new TypeError('Failed to fetch'));
    abre();
    await eligeCampo();

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
  });
});
