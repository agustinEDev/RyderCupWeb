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
 *   14b  del Resumen al paso 1 y avanzar sin cambiar| los copiados siguen
 *   E1   en modo estricto (desarrollo, el iPhone   | la barra copiada no se pierde
 *        | por Vite): los efectos se montan dos veces| (revisor)
 *   E2   cambiar de campo                           | la barra copiada sí se va
 *   C3   cada aviso                                 | solo en el paso donde se arregla
 *        |                                           | (`/code-review`)
 *   A1   quitar a uno que anotaba, también al abrir | anotan los demás que anotaban
 *        | en Jugadores por un aviso                  | (`anotadoresAlVolver`, 4 nov)
 *   A3   quitar a uno que no anotaba                | los anotadores, igual
 *
 * Todo se monta en `<StrictMode>`, como la aplicación.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { StrictMode } from 'react';
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
      onClick={() => onCourseSelect({ id: 'course-2', name: 'Otro campo' })}
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
  // Sin partidas anteriores: la barra no se sugiere por «la última vez» (FE #1025)
  listMyQuickMatchesUseCase: { execute: () => Promise.resolve({ quickMatches: [] }) },
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
    <StrictMode>
      <MemoryRouter>
        <CreateQuickMatchModal onClose={onClose} onStarted={vi.fn()} currentUser={yo} borrador={borrador()} {...props} />
      </MemoryRouter>
    </StrictMode>
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
          { tipo: 'noAmigo', nombre: 'Luis', paso: 2 },
          { tipo: 'barra', propia: false, nombre: 'Ana', color: 'RED', genero: 'FEMALE', paso: 2 },
        ],
      }),
    });

    const avisos = await screen.findByTestId('avisos-al-repetir');
    expect(within(avisos).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'create.repetir.avisoNoAmigo',
      'create.repetir.avisoBarra',
    ]);
    // Se anuncian: quien usa lector de pantalla oye que alguien se quedó fuera
    expect(avisos.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByTestId('quick-match-participants-next')).toBeInTheDocument();
  });

  it('C3: cada aviso, solo en su paso', async () => {
    abre({
      borrador: borrador({
        paso: 2,
        avisos: [
          { tipo: 'sinBarra', propia: true, color: null, genero: null, paso: 1 },
          { tipo: 'noAmigo', nombre: 'Luis', paso: 2 },
        ],
      }),
    });

    const enJugadores = await screen.findByTestId('avisos-al-repetir');
    expect(within(enJugadores).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['create.repetir.avisoNoAmigo']);

    fireEvent.click(screen.getByTestId('quick-match-participants-back'));

    const enElCampo = await screen.findByTestId('avisos-al-repetir');
    expect(within(enElCampo).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['create.repetir.avisoMiBarraNueva']);
  });

  it('R13: cerrar no crea nada', async () => {
    const { onClose } = abre();
    await screen.findByTestId('quick-match-start');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(onClose).toHaveBeenCalled();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('14b: del Resumen al paso 1 y otra vez adelante, sin cambiar nada, siguen los copiados', async () => {
    abre();
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId('quick-match-summary-back'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-back'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-back'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await screen.findByTestId('quick-match-participants-next');
    expect(screen.getByText('Rafa')).toBeInTheDocument();
    expect(screen.getByText('Pepe Pérez')).toBeInTheDocument();
  });

  // Pasada en el Kind (4 nov 2026):
  //   K1  volver al paso 2 y avanzar sin cambiar a nadie | siguen los anotadores
  //   K2b volver al paso 2 y quitar a un jugador         | se vuelven a elegir
  //   K3  un % copiado que no está entre los botones     | sale como uno más, marcado,
  //       solo en la modalidad en que se copió
  it('K1: volver a los jugadores y avanzar sin cambiar a nadie conserva los anotadores', async () => {
    abre();
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId('quick-match-summary-back'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-back'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-next'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
    fireEvent.click(await screen.findByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(mockIniciar.mock.calls[0][0].scorerUserIds).toEqual(['user-1', 'user-2']);
  });

  it('K2b y A3: quitar a uno que no anotaba (el invitado) conserva los anotadores', async () => {
    abre();
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId('quick-match-summary-back'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-back'));
    fireEvent.click(await screen.findByTestId('quick-match-remove-invitado-x'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-next'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
    fireEvent.click(await screen.findByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(mockIniciar.mock.calls[0][0].scorerUserIds).toEqual(['user-1', 'user-2']);
  });

  it('A1: quitar a uno que anotaba deja anotando a los demás que anotaban', async () => {
    const conAna = borrador();
    conAna.inicial.participants.push({
      participantId: 'user-3', userId: 'user-3', name: 'Ana', handicap: 8, profileHandicap: 8, team: null, isGuest: false, color: 'RED', teeGender: 'FEMALE',
    });
    conAna.inicial.participants = conAna.inicial.participants.filter((p) => !p.isGuest);
    conAna.inicial.scorerIds = ['user-1', 'user-2', 'user-3'];
    abre({ borrador: conAna });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId('quick-match-summary-back'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-back'));
    fireEvent.click(await screen.findByTestId('quick-match-remove-user-2'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-next'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
    fireEvent.click(await screen.findByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(mockIniciar.mock.calls[0][0].scorerUserIds).toEqual(['user-1', 'user-3']);
  });

  it('A1: al repetir con un aviso (se abre en Jugadores), corregir no pierde los anotadores copiados', async () => {
    abre({ borrador: borrador({ paso: 2, avisos: [{ tipo: 'noAmigo', nombre: 'Luis', paso: 2 }] }) });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId('quick-match-remove-invitado-x'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-next'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
    fireEvent.click(await screen.findByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(mockIniciar.mock.calls[0][0].scorerUserIds).toEqual(['user-1', 'user-2']);
  });

  it('K3: un % copiado que no está entre los botones sale como uno más, marcado', async () => {
    abre({ borrador: borrador({ paso: 1, inicial: { ...borrador().inicial, allowanceOverride: 80 } }) });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    const ochenta = screen.getByTestId('quick-match-allowance-option-80');
    expect(ochenta.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByTestId('quick-match-allowance-option-90'));
    expect(screen.getByTestId('quick-match-allowance-option-80')).toBeInTheDocument();
  });

  it('K3c: el % copiado sigue ofreciéndose tras ir al paso 2 y volver', async () => {
    abre({ borrador: borrador({ paso: 1, inicial: { ...borrador().inicial, allowanceOverride: 80 } }) });
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-allowance-option-90'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    fireEvent.click(await screen.findByTestId('quick-match-participants-back'));

    expect(await screen.findByTestId('quick-match-allowance-option-80')).toBeInTheDocument();
  });

  it('K3b: el % copiado no se ofrece en la otra modalidad', async () => {
    abre({ borrador: borrador({ paso: 1, inicial: { ...borrador().inicial, allowanceOverride: 80 } }) });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('format-option-SINGLES'));

    expect(screen.queryByTestId('quick-match-allowance-option-80')).not.toBeInTheDocument();
  });

  it('E2: cambiar de campo sí borra la barra copiada', async () => {
    abre({ borrador: borrador({ paso: 1 }) });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalledWith('course-2'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent('create.course.errorTeeRequired');
  });
});
