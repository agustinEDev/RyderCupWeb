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
 *        |                                           | la que ya creó)
 *   12b  un equipo ya completo                      | se avisa en el momento, sin añadir
 *   14b  volver al paso 1                           | la plantilla empieza de nuevo
 *
 * Y lo que añadió la revisión (14 oct):
 *
 *   V1   vaciar el hándicap de un registrado        | vuelve el del perfil, sin override
 *   V2   un amigo sin hándicap al que se le pone    | viaja como override
 *   V3   el hándicap tecleado de un invitado        | viaja en la petición
 *   V4   un 5xx; un 429                             | el genérico; el texto de la app; el
 *        |                                           | borrador sigue
 *   V5   sin respuesta, se cambia algo y se reintenta| el MISMO id: si se creó, vuelve esa
 *   V6   un 4xx, se cambia algo y se reintenta       | otro id: no se creó nada
 *   V7   el aviso de error                          | se desplaza a la vista
 *   V8   la lista de amigos                         | se piden hasta 100
 *   V9   «equipo completo» y se cambia de equipo     | el aviso se va
 *
 * Y lo que añadió `/code-review`:
 *
 *   C1   sin respuesta, se cambia algo y se crea     | se avisa de que valió lo de antes
 *        | (el servidor devuelve la que ya había)    |
 *   C1b  sin respuesta y se reintenta igual         | sin aviso
 *   C3   un fallo antes de llegar al servidor       | no fija el id: cambiar algo, otro
 *   C5   más de 100 amigos                          | se piden todas las páginas
 *   Q1   invitado con nombre o apellido en blanco   | se avisa y no se añade (QA)
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

  it('R · reintentar lo mismo tras un fallo usa el mismo id', async () => {
    mockIniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    abre();
    await alPaso2();
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).toBe(peticion(0).quickMatchId);
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

  it('V1 · vaciar el hándicap de un registrado vuelve al del perfil, sin override', async () => {
    abre();
    await alPaso2();
    await anadeAmigo('f-1');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-2'));
    teclea(await screen.findByRole('dialog', { name: 'Rafa' }), '');
    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '');

    expect(screen.getByTestId('quick-match-handicap-button-user-2')).toHaveTextContent('20.1');
    expect(screen.getByTestId('quick-match-handicap-button-user-1')).toHaveTextContent('12.4');
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().creatorHandicap).toBeNull();
    expect(peticion().participants[0].handicap).toBeNull();
  });

  it('V2 · un amigo sin hándicap al que se le pone uno: viaja como override', async () => {
    abre();
    await alPaso2();
    await anadeAmigo('f-2');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-3'));
    teclea(await screen.findByRole('dialog', { name: 'Luis' }), '25');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().participants[0]).toMatchObject({ friendUserId: 'user-3', handicap: 25 });
  });

  it('V3 · el hándicap tecleado de un invitado viaja en la petición', async () => {
    abre();
    await alPaso2();
    fireEvent.click(screen.getByTestId('quick-match-tab-guest'));
    fireEvent.click(screen.getByTestId('quick-match-guest-handicap-button'));
    teclea(await screen.findByRole('dialog', { name: 'create.participants.guestHandicap' }), '18.4');
    anadeInvitado('Ana', 'Pérez');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().participants[0]).toMatchObject({ kind: 'GUEST', handicap: 18.4 });
  });

  it.each([
    [503, 'Service Unavailable', 'create.errors.generic'],
    [429, 'Demasiadas peticiones', 'Demasiadas peticiones'],
  ])('V4 · un %i: %s, y el borrador sigue', async (status, texto, esperado) => {
    mockIniciar.mockRejectedValue(Object.assign(new Error(texto), { status }));
    abre();
    await alPaso2();
    await anadeAmigo('f-1');
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent(esperado);
    expect(screen.getByText('Rafa')).toBeInTheDocument();
  });

  it.each([
    ['sin red', new TypeError('Failed to fetch')],
    ['un 503', Object.assign(new Error('Service Unavailable'), { status: 503 })],
  ])('V5 · %s, se cambia algo y se reintenta: el MISMO id', async (_caso, fallo) => {
    mockIniciar.mockRejectedValueOnce(fallo);
    abre();
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).toBe(peticion(0).quickMatchId);
    expect(peticion(1).creatorHandicap).toBe(8);
  });

  it('V6 · un 4xx, se cambia algo y se reintenta: otro id', async () => {
    mockIniciar.mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 422 }));
    abre();
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).not.toBe(peticion(0).quickMatchId);
  });

  it('V7 · el aviso de error se desplaza a la vista', async () => {
    const desplaza = vi.fn();
    globalThis.Element.prototype.scrollIntoView = desplaza;
    mockIniciar.mockRejectedValue(Object.assign(new Error('nope'), { status: 422 }));
    abre();
    await alPaso2();
    await alResumen();

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await screen.findByTestId('quick-match-modal-error');
    await waitFor(() => expect(desplaza).toHaveBeenCalled());
    delete globalThis.Element.prototype.scrollIntoView;
  });

  it('V8 · la lista de amigos se pide entera (hasta 100)', async () => {
    abre();
    await alPaso2();

    expect(mockListFriends).toHaveBeenCalledWith('user-1', { limit: 100, page: 1 });
  });

  it('V9 · el aviso de «equipo completo» se va al cambiar de equipo', async () => {
    abre();
    await alPaso2({ libre: false, formato: 'FOURBALL' });
    await anadeAmigo('f-1');
    anadeInvitado('Ana', 'Pérez');
    expect(screen.getByTestId('quick-match-modal-error')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-match-team-B'));

    expect(screen.queryByTestId('quick-match-modal-error')).not.toBeInTheDocument();
  });

  it('V1b · vaciar el de un invitado lo deja sin hándicap', async () => {
    abre();
    await alPaso2();
    fireEvent.click(screen.getByTestId('quick-match-tab-guest'));
    fireEvent.click(screen.getByTestId('quick-match-guest-handicap-button'));
    teclea(await screen.findByRole('dialog', { name: 'create.participants.guestHandicap' }), '18.4');
    anadeInvitado('Ana', 'Pérez');
    await alResumen();
    const boton = screen.getAllByTestId(/^quick-match-handicap-button-invitado-/)[0];

    fireEvent.click(boton);
    teclea(await screen.findByRole('dialog', { name: 'Ana Pérez' }), '');

    expect(boton).toHaveTextContent('create.summary.handicapPlaceholder');
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().participants[0].handicap).toBeNull();
  });

  it('C1 · sin respuesta, se cambia algo y se crea: se avisa de que valió lo de antes', async () => {
    mockIniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const onStarted = vi.fn();
    abre({ onStarted });
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('qm-1'));
    expect(mockToastInfo).toHaveBeenCalledWith('create.alreadyCreated');
  });

  it('C1b · sin respuesta y se reintenta igual: sin aviso', async () => {
    mockIniciar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const onStarted = vi.fn();
    abre({ onStarted });
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(onStarted).toHaveBeenCalled());
    expect(mockToastInfo).not.toHaveBeenCalled();
  });

  it('C3 · un fallo antes de llegar al servidor no fija el id', async () => {
    mockIniciar.mockRejectedValueOnce(new Error('scorerUserIds must contain 1 to 4 user ids'));
    abre();
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).not.toBe(peticion(0).quickMatchId);
  });

  it('C5 · con más de 100 amigos se piden todas las páginas', async () => {
    const amigo = (n) => ({ id: `f-${n}`, otherUserId: `u-${n}`, otherUserName: `Amigo ${n}`, otherUserHandicap: null });
    mockListFriends.mockImplementation((_id, { page }) =>
      Promise.resolve({
        friendships: page === 1 ? Array.from({ length: 100 }, (_, i) => amigo(i)) : [amigo(100), amigo(101)],
        totalCount: 102,
      })
    );
    abre();
    await alPaso2();

    expect(await screen.findByTestId('quick-match-add-friend-f-101')).toBeInTheDocument();
    expect(mockListFriends).toHaveBeenCalledWith('user-1', { limit: 100, page: 1 });
    expect(mockListFriends).toHaveBeenCalledWith('user-1', { limit: 100, page: 2 });
  });

  it('C5b · justo 100 amigos: una sola página', async () => {
    const amigo = (n) => ({ id: `f-${n}`, otherUserId: `u-${n}`, otherUserName: `Amigo ${n}`, otherUserHandicap: null });
    mockListFriends.mockResolvedValue({ friendships: Array.from({ length: 100 }, (_, i) => amigo(i)), totalCount: 100 });
    abre();
    await alPaso2();

    await screen.findByTestId('quick-match-add-friend-f-99');
    expect(mockListFriends).toHaveBeenCalledTimes(1);
  });

  it('C5c · un total que no cuadra no pide páginas para siempre', async () => {
    mockListFriends.mockImplementation((_id, { page }) =>
      Promise.resolve({ friendships: page === 1 ? AMIGOS.friendships : [], totalCount: 150 })
    );
    abre();
    await alPaso2();

    await screen.findByTestId('quick-match-add-friend-f-2');
    expect(mockListFriends).toHaveBeenCalledTimes(2);
  });

  it('C3b · cortada por tiempo cuenta como «pudo llegar»: el mismo id', async () => {
    mockIniciar.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    abre();
    await alPaso2();
    await alResumen();
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await screen.findByTestId('quick-match-modal-error');

    fireEvent.click(screen.getByTestId('quick-match-handicap-button-user-1'));
    teclea(await screen.findByRole('dialog', { name: 'Yo' }), '8');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalledTimes(2));
    expect(peticion(1).quickMatchId).toBe(peticion(0).quickMatchId);
  });

  it.each([
    ['nombre', '   ', 'Pérez'],
    ['apellido', 'Ana', '   '],
  ])('Q1 · invitado con el %s en blanco: se avisa y no se añade', async (_campo, nombre, apellido) => {
    abre();
    await alPaso2();

    anadeInvitado(nombre, apellido);

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.participants.errorGuestName');
    expect(screen.queryAllByTestId(/^quick-match-remove-invitado-/)).toHaveLength(0);
  });

  it('Q1b · corregido el nombre, el aviso se va y se añade', async () => {
    abre();
    await alPaso2();
    anadeInvitado('   ', 'Pérez');
    expect(screen.getByTestId('quick-match-modal-error')).toBeInTheDocument();

    anadeInvitado('Ana', 'Pérez');

    expect(screen.queryByTestId('quick-match-modal-error')).not.toBeInTheDocument();
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });

  it('Q1c · el aviso se va en cuanto se corrige el nombre, sin esperar a «Añadir»', async () => {
    abre();
    await alPaso2();
    anadeInvitado('   ', 'Pérez');
    expect(screen.getByTestId('quick-match-modal-error')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('quick-match-guest-first-name'), { target: { value: 'Ana' } });

    expect(screen.queryByTestId('quick-match-modal-error')).not.toBeInTheDocument();
  });
});

