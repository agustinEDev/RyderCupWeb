/**
 * LA TABLA — el asistente de partida rápida como borrador (FE #848),
 * aprobada el 13 oct 2026:
 *
 *   #    caso                                       | qué pasa
 *   -----|-------------------------------------------|----------------------------------
 *   11   pasar el paso 1                            | no se crea nada en el servidor
 *   12   añadir, quitar, equipos, barras            | en el borrador, sin llamar a nadie
 *   13   el resumen                                 | mi hándicap del perfil, el del
 *        |                                           | amigo de la lista, el del invitado
 *        |                                           | el que se tecleó; cambiarlo, local
 *   14   cerrar, Escape, volver al paso 1           | nada que cancelar
 *   15   «Confirmar e iniciar»                      | UNA petición con todo, en el orden
 *        |                                           | en que se añadieron; abre la partida
 *   16   el servidor lo rechaza                     | el motivo en el resumen, traducido
 *        |                                           | por código; el borrador se queda
 *   17   sin red                                    | el aviso de siempre; el borrador
 *        |                                           | se queda
 *   18   foursomes: las dos parejas / la mía        | los UserId de quien anota
 *   R    reintentar lo mismo tras un fallo          | el MISMO id (el servidor devuelve
 *        |                                           | la que ya creó); cambiar algo, otro
 *   12b  un equipo ya completo                      | se avisa en el momento, sin añadir
 *   14b  volver al paso 1                           | la plantilla empieza de nuevo
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

vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockIniciar(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  cancelQuickMatchUseCase: { execute: (...a) => mockCancel(...a) },
}));

const yo = { id: 'user-1', country_code: 'ES', display_name: 'Yo', handicap: 12.4 };
const AMIGOS = {
  friendships: [
    { id: 'f-1', otherUserId: 'user-2', otherUserName: 'Rafa', otherUserHandicap: 20.1 },
    { id: 'f-2', otherUserId: 'user-3', otherUserName: 'Luis', otherUserHandicap: null },
  ],
  totalCount: 2,
};

const abre = (props = {}) =>
  render(
    <MemoryRouter>
      <CreateQuickMatchModal onClose={vi.fn()} onStarted={vi.fn()} currentUser={yo} {...props} />
    </MemoryRouter>
  );

const alPaso2 = async ({ libre = true, formato } = {}) => {
  if (libre) fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
  if (formato) fireEvent.click(screen.getByTestId(`format-option-${formato}`));
  fireEvent.click(screen.getByTestId('select-course-stub'));
  await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
  fireEvent.click(screen.getByTestId('quick-match-course-next'));
  await screen.findByTestId('quick-match-participants-next');
};

const anadeAmigo = async (id) => {
  fireEvent.click(screen.getByTestId('quick-match-tab-friends'));
  fireEvent.click(await screen.findByTestId(`quick-match-add-friend-${id}`));
};

const anadeInvitado = (nombre, apellido) => {
  fireEvent.click(screen.getByTestId('quick-match-tab-guest'));
  fireEvent.change(screen.getByTestId('quick-match-guest-first-name'), { target: { value: nombre } });
  fireEvent.change(screen.getByTestId('quick-match-guest-last-name'), { target: { value: apellido } });
  fireEvent.click(screen.getByTestId('quick-match-add-guest'));
};

const alResumen = async () => {
  await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
  fireEvent.click(screen.getByTestId('quick-match-participants-next'));
  fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
  await screen.findByTestId('quick-match-start');
};

const peticion = (n = 0) => mockIniciar.mock.calls[n][0];

// El panel empieza con el valor que hay: se borra con el retroceso y se teclea
const teclea = (panel, valor) => {
  for (let i = 0; i < 6; i += 1) fireEvent.click(within(panel).getByTestId('handicap-panel-backspace'));
  for (const c of valor) fireEvent.click(within(panel).getByText(c));
  fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));
};

describe('CreateQuickMatchModal · borrador hasta «Confirmar e iniciar» (FE #848)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFriends.mockResolvedValue(AMIGOS);
    mockGetGolfCourse.mockResolvedValue({ tees: [] });
    mockIniciar.mockResolvedValue({ id: 'qm-1' });
  });

  it('11 · pasar el paso 1 no crea nada', async () => {
    abre();

    await alPaso2();

    expect(mockIniciar).not.toHaveBeenCalled();
    expect(screen.getByText('Yo')).toBeInTheDocument();
  });

  it('12 · añadir y quitar se quedan en el borrador', async () => {
    abre();
    await alPaso2();

    await anadeAmigo('f-1');
    anadeInvitado('Ana', 'Pérez');
    expect(await screen.findByText('Rafa')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-match-remove-user-2'));

    expect(screen.queryByText('Rafa')).not.toBeInTheDocument();
    expect(mockIniciar).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('13 · el resumen enseña cada hándicap sin crear nada; cambiarlo es local', async () => {
    abre();
    await alPaso2();
    await anadeAmigo('f-1');
    await anadeAmigo('f-2');
    await alResumen();

    expect(screen.getByTestId('quick-match-handicap-button-user-1')).toHaveTextContent('12.4');
    expect(screen.getByTestId('quick-match-handicap-button-user-2')).toHaveTextContent('20.1');
    expect(screen.getByTestId('quick-match-handicap-button-user-3')).toHaveTextContent(
      'create.summary.handicapPlaceholder'
    );

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-2'));
    const panel = await screen.findByRole('dialog', { name: 'Rafa' });
    teclea(panel, '30');

    expect(screen.getByTestId('quick-match-handicap-button-user-2')).toHaveTextContent('30');
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('14 · cerrar, Escape o volver al paso 1: nada que cancelar', async () => {
    const onClose = vi.fn();
    abre({ onClose });
    await alPaso2();

    fireEvent.click(screen.getByTestId('quick-match-participants-back'));
    expect(await screen.findByTestId('quick-match-course-next')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('15 · confirmar manda UNA petición con todo, en orden, y abre la partida', async () => {
    const onStarted = vi.fn();
    abre({ onStarted });
    await alPaso2();
    anadeInvitado('Ana', 'Pérez');
    await anadeAmigo('f-1');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('qm-1'));
    expect(mockIniciar).toHaveBeenCalledTimes(1);
    expect(peticion()).toEqual({
      quickMatchId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      golfCourseId: 'course-1',
      matchFormat: null,
      scoringFormat: 'STABLEFORD',
      name: null,
      allowancePercentage: 95,
      playMode: 'HANDICAP',
      creatorTeeColor: null,
      creatorTeeGender: null,
      creatorHandicap: null,
      participants: [
        {
          kind: 'GUEST',
          firstName: 'Ana',
          lastName: 'Pérez',
          handicap: null,
          team: null,
          teeColor: null,
          teeGender: null,
        },
        { kind: 'FRIEND', friendUserId: 'user-2', handicap: null, team: null, teeColor: null, teeGender: null },
      ],
      scorerUserIds: ['user-1'],
    });
  });

  it('15b · el hándicap cambiado viaja como override; el del perfil, no', async () => {
    abre();
    await alPaso2();
    await anadeAmigo('f-1');
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    const panel = await screen.findByRole('dialog', { name: 'Yo' });
    teclea(panel, '9');

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().creatorHandicap).toBe(9);
    expect(peticion().participants[0].handicap).toBeNull();
  });

  it.each([
    [404, 'create.errors.notFound'],
    [403, 'create.errors.notFriends'],
    [409, 'create.errors.conflict'],
    [422, 'create.errors.invalid'],
  ])('16 · un %i: su motivo, en el resumen, y el borrador sigue', async (status, clave) => {
    mockIniciar.mockRejectedValue(Object.assign(new Error('server text'), { status }));
    abre();
    await alPaso2();
    await anadeAmigo('f-1');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent(clave);
    expect(screen.getByTestId('quick-match-start')).not.toBeDisabled();
    expect(screen.getByText('Rafa')).toBeInTheDocument();
  });

  it('17 · sin red: el aviso de siempre, y el borrador sigue', async () => {
    mockIniciar.mockRejectedValue(new TypeError('Failed to fetch'));
    abre();
    await alPaso2();
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent('sinConexion.mensaje');
    expect(screen.getByTestId('quick-match-start')).toBeInTheDocument();
  });

  it('R · reintentar lo mismo usa el mismo id; cambiar algo, otro', async () => {
    mockIniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mockIniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    abre();
    await alPaso2();
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).toBe(peticion(0).quickMatchId);

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    const panel = await screen.findByRole('dialog', { name: 'Yo' });
    teclea(panel, '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(3));
    expect(peticion(2).quickMatchId).not.toBe(peticion(0).quickMatchId);
  });

  it('18 · foursomes: las dos parejas anotan, por su UserId', async () => {
    abre();
    await alPaso2({ libre: false, formato: 'FOURSOMES' });
    await anadeAmigo('f-1');
    fireEvent.click(screen.getByTestId('quick-match-team-B'));
    await anadeAmigo('f-2');
    anadeInvitado('Ana', 'Pérez');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().scorerUserIds).toEqual(['user-1', 'user-2', 'user-3']);
    expect(peticion().participants.map((p) => p.team)).toEqual(['A', 'B', 'B']);
  });

  it('12b · un equipo ya completo se avisa en el momento, sin añadir', async () => {
    abre();
    await alPaso2({ libre: false, formato: 'FOURBALL' });
    await anadeAmigo('f-1');

    anadeInvitado('Ana', 'Pérez');

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.participants.errorTeamFull');
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
  });

  it('12c · y lo mismo con un amigo', async () => {
    abre();
    await alPaso2({ libre: false, formato: 'FOURBALL' });
    await anadeAmigo('f-1');

    await anadeAmigo('f-2');

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.participants.errorTeamFull');
    expect(screen.queryByTestId('quick-match-remove-user-3')).toBeNull();
  });

  it('14b · volver al paso 1 empieza la plantilla de nuevo', async () => {
    abre();
    await alPaso2();
    anadeInvitado('Ana', 'Pérez');
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-match-participants-back'));
    fireEvent.click(await screen.findByTestId('quick-match-course-next'));

    await screen.findByTestId('quick-match-participants-next');
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
  });
});
