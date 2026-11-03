/**
 * El asistente abierto para repetir una partida rápida (FE #1021). Tabla
 * aprobada el 3 nov 2026 (R4, R7-R9, R12, R13; el borrador lo monta
 * `borradorParaRepetir`, que tiene sus propias pruebas):
 *
 *   #    caso                                       | asistente
 *   -----|-------------------------------------------|----------------------------------
 *   R4   todo vale                                  | «Repetir partida», en el Resumen,
 *        |                                           | con los jugadores copiados
 *   R4b  cargan las barras del campo                | la barra copiada sigue elegida
 *   R7   avisos de lo que no se copió               | a la vista, en su texto
 *   R12  confirmar                                  | la petición lleva lo copiado
 *   R13  cerrar                                     | no se crea nada
 *   14b  volver al paso 1 y avanzar sin cambiar     | los copiados siguen
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.current !== undefined) return `${key}_${params.current}_${params.total}`;
      if (params?.count !== undefined) return `${key}_${params.count}_${params.max}`;
      return key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <button
      type="button"
      data-testid="select-course-stub"
      onClick={() => onCourseSelect({ id: 'course-1', name: 'St Andrews' })}
    >
      Select course
    </button>
  ),
}));

const mockIniciar = vi.fn();
const mockListFriends = vi.fn();
const mockGetGolfCourse = vi.fn();
const mockCancel = vi.fn();

const mockToastInfo = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { info: (...a) => mockToastInfo(...a), error: vi.fn(), success: vi.fn() } }));

vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockIniciar(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  cancelQuickMatchUseCase: { execute: (...a) => mockCancel(...a) },
}));

const yo = { id: 'user-1', country_code: 'ES', display_name: 'Yo', handicap: 12.4 };
const CAMPO = { id: 'course-1', name: 'St Andrews', tees: [{ color: 'YELLOW', gender: 'MALE' }, { color: 'RED', gender: 'FEMALE' }] };

const borrador = (extra = {}) => ({
  paso: 4,
  avisos: [],
  inicial: {
    matchName: 'Domingo',
    mode: 'FREE_PLAY',
    matchFormat: 'SINGLES',
    scoringFormat: 'STABLEFORD',
    allowanceOverride: 95,
    playMode: 'HANDICAP',
    selectedCourse: CAMPO,
    creatorTeeKey: 'YELLOW|MALE',
    participants: [
      { participantId: 'user-1', userId: 'user-1', name: 'Yo', handicap: 12.4, profileHandicap: 12.4, team: null, isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
      { participantId: 'user-2', userId: 'user-2', name: 'Rafa', handicap: 20.1, profileHandicap: 20.1, team: null, isGuest: false, color: 'RED', teeGender: 'FEMALE' },
      { participantId: 'invitado-x', userId: null, name: 'Pepe Pérez', firstName: 'Pepe', lastName: 'Pérez', handicap: 22, team: null, isGuest: true, color: 'YELLOW', teeGender: 'MALE' },
    ],
    scorerIds: ['user-1', 'user-2'],
  },
  ...extra,
});

const abre = (props = {}) => {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <CreateQuickMatchModal onClose={onClose} onStarted={vi.fn()} currentUser={yo} borrador={borrador()} {...props} />
    </MemoryRouter>
  );
  return { onClose };
};

describe('CreateQuickMatchModal · repetir una partida (FE #1021)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFriends.mockResolvedValue({ friendships: [], totalCount: 0 });
    mockGetGolfCourse.mockResolvedValue({ tees: CAMPO.tees, isFromRfeg: () => false });
    mockIniciar.mockResolvedValue({ id: 'qm-2' });
  });

  it('R4: se abre en el Resumen, como «Repetir partida», con los jugadores copiados', async () => {
    abre();

    expect(screen.getByRole('heading', { name: 'create.repetir.titulo' })).toBeInTheDocument();
    expect(await screen.findByTestId('quick-match-start')).toBeInTheDocument();
    expect(screen.getByText('Rafa')).toBeInTheDocument();
    expect(screen.getByText('Pepe Pérez')).toBeInTheDocument();
  });

  it('R4b y R12: con las barras ya cargadas, confirmar manda lo copiado (y la barra copiada)', async () => {
    abre();
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    fireEvent.click(await screen.findByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    const peticion = mockIniciar.mock.calls[0][0];
    expect(peticion).toMatchObject({
      golfCourseId: 'course-1',
      name: 'Domingo',
      scoringFormat: 'STABLEFORD',
      allowancePercentage: 95,
      playMode: 'HANDICAP',
      creatorTeeColor: 'YELLOW',
      creatorTeeGender: 'MALE',
      creatorHandicap: null,
      scorerUserIds: ['user-1', 'user-2'],
    });
    expect(peticion.participants).toEqual([
      { kind: 'FRIEND', friendUserId: 'user-2', handicap: null, team: null, teeColor: 'RED', teeGender: 'FEMALE' },
      { kind: 'GUEST', firstName: 'Pepe', lastName: 'Pérez', handicap: 22, team: null, teeColor: 'YELLOW', teeGender: 'MALE' },
    ]);
  });

  it('R7: los avisos de lo que no se copió, a la vista', async () => {
    abre({
      borrador: borrador({
        paso: 2,
        avisos: [
          { tipo: 'noAmigo', nombre: 'Luis' },
          { tipo: 'barra', propia: false, nombre: 'Ana', color: 'RED' },
        ],
      }),
    });

    const avisos = await screen.findByTestId('avisos-al-repetir');
    expect(within(avisos).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'create.repetir.avisoNoAmigo',
      'create.repetir.avisoBarra',
    ]);
    expect(screen.getByTestId('quick-match-participants-next')).toBeInTheDocument();
  });

  it('R13: cerrar no crea nada', async () => {
    const { onClose } = abre();
    await screen.findByTestId('quick-match-start');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(onClose).toHaveBeenCalled();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('14b: volver al paso 1 y avanzar sin cambiar nada conserva a los copiados', async () => {
    abre({ borrador: borrador({ paso: 1 }) });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await screen.findByTestId('quick-match-participants-next');
    expect(screen.getByText('Rafa')).toBeInTheDocument();
    expect(screen.getByText('Pepe Pérez')).toBeInTheDocument();
  });
});
