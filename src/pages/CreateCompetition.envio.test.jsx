import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import {
  MemoryRouter,
  Routes,
  Route,
  useParams,
  useLocation,
  useNavigate,
} from 'react-router';
import { agendaPropuesta } from '../utils/agenda';
import {
  ajustesParaCrear,
  formularioDeAjustes,
} from '../utils/ajustesDeStrokePlay';
import { CUPO_POR_DEFECTO } from '../utils/cupoDeJugadores';

/**
 * Lo que manda el formulario de competición y lo que hace después, fijado tal
 * como es HOY antes de partir la página en piezas (refactor sin cambios):
 *
 *   #     caso                                                | qué pasa
 *   ------|-----------------------------------------------------|------------------------------
 *   EN1   crear una Ryder privada con dos adyacentes y tope 18 | la petición entera, campos y agenda
 *   EN2   crear un Medal                                      | stroke_play y organizer_plays; sin
 *         |                                                    | equipos ni setup_mode
 *   EN3   editar una Ryder y un Medal                         | sin tipo, ni stroke_play, ni
 *         |                                                    | organizer_plays
 *   EN4   tope vacío / «18.7»                                 | null / 18
 *   EN5   cupo vacío: al crear / al editar                    | el de por defecto / el cargado
 *   EN6   tras crear                                          | a la ficha nueva a los 1500 ms, no antes
 *   EN7   tras editar                                         | a la ficha a los 1000 ms
 *   EN8   se desmonta antes del temporizador                  | no navega
 *   EN9   los avisos del alta                                 | éxito, parcial (cuentas y nombres),
 *         |                                                    | sin campos
 *   EN10  «Cancelar»                                          | a /competitions
 *   EN11  mientras se envía                                   | «creando»/«actualizando», deshabilitado
 *   EN12  faltan campos de algún país                         | los países por su nombre, en el
 *         |                                                    | idioma activo
 *   EN13  se escribe en un campo / se cambia el adyacente /   | se va el aviso / se queda / se va
 *         | se cambia el tercer país                           | (rareza que se conserva)
 *   EN14  cargando la edición / sin usuario                   | «edit.loading» / nada
 */
const idioma = vi.hoisted(() => ({ actual: 'es' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores && !('defaultValue' in valores)
        ? `${clave} ${JSON.stringify(valores)}`
        : clave,
    i18n: { language: idioma.actual },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/auth/AvisoVerificaParaLlegarAOtros', () => ({
  default: () => null,
}));
// El mismo `user` en cada render: uno nuevo relanza los efectos (intermitente)
const USUARIO = vi.hoisted(() => ({
  user: { id: 'u-1', gender: 'MALE' },
  loading: false,
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => USUARIO }));
// El correo verificado, a mano: cuántas veces se pregunta (D5)
const correo = vi.hoisted(() => ({ sinVerificar: false, confirma: null }));
vi.mock('../hooks/useCorreoVerificado', () => ({
  useCorreoVerificado: () => correo,
}));
const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('../utils/toast', () => ({ default: mockToast }));
vi.mock('../services/countries', () => ({
  formatCountryName: (pais, lengua) => `${pais?.code}:${lengua}`,
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  updateStrokePlaySettingsUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn() },
  getAdjacentCountriesUseCase: { execute: vi.fn() },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
  configureScheduleUseCase: { execute: vi.fn() },
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ countries, onChange }) => (
    <div>
      <p data-testid="paises-listos">{countries.length}</p>
      <button type="button" onClick={() => onChange('ES')}>
        elegir ES
      </button>
    </div>
  ),
}));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ countryCode, onCourseSelect }) => (
    <button
      type="button"
      onClick={() =>
        onCourseSelect({
          id: `${countryCode}-1`,
          name: `Campo ${countryCode}-1`,
        })
      }
    >
      {`campo de ${countryCode}`}
    </button>
  ),
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({
  default: () => null,
}));
vi.mock('../components/ui/FullScreenLoader', () => ({
  default: ({ texto }) => <p data-testid="cargando">{texto}</p>,
}));
vi.mock('../components/ui/CountryFlag', () => ({ CountryFlag: () => null }));

// Lo que valida el formulario lo prueban sus tests: aquí, qué se envía. Con
// segundo argumento es el envío; sin él, el resumen del plegable
const mockValidar = vi.hoisted(() => vi.fn(() => null));
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));

const composicion = await import('../composition');
const CreateCompetition = (await import('./CreateCompetition')).default;

const pais = (code) => ({ code, name_es: code, name_en: code });
// AD no está en la lista de todos: solo llega como vecino de Francia
const PAISES = ['ES', 'FR', 'PT'].map(pais);
const VECINOS = {
  ES: ['FR', 'PT'],
  FR: ['ES', 'AD', 'PT'],
  PT: ['ES'],
};

const Ficha = () => <p data-testid="ficha">{useParams().id}</p>;
const Donde = () => <p data-testid="donde">{useLocation().pathname}</p>;
// Ir al alta sin desmontar la página (F1): la app remonta (`key` en App.jsx),
// pero el hook se defiende de un `competitionId` que cambie sin remontar
const IrAlAlta = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/competitions/create')}>
      ir al alta
    </button>
  );
};
const Desmontable = () => {
  const [montada, setMontada] = useState(true);
  return (
    <>
      {montada && <CreateCompetition />}
      <button type="button" onClick={() => setMontada(false)}>
        desmontar
      </button>
    </>
  );
};

const renderEn = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Donde />
      <IrAlAlta />
      <Routes>
        <Route path="/competitions/create" element={<Desmontable />} />
        <Route path="/competitions/:id/edit" element={<Desmontable />} />
        <Route path="/competitions/:id" element={<Ficha />} />
        <Route path="/competitions" element={<p>lista</p>} />
      </Routes>
    </MemoryRouter>,
  );

const escribe = (elemento, valor) =>
  fireEvent.change(elemento, { target: { value: valor } });

const abreElAlta = async (tipo = 'RYDER_CUP') => {
  renderEn('/competitions/create');
  fireEvent.click(await screen.findByTestId(`tipo-${tipo}`));
  if (tipo === 'RYDER_CUP')
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await waitFor(() =>
    expect(screen.getByTestId('paises-listos')).toHaveTextContent('3'),
  );
};

const rellenaLoBasico = (nombre = 'Ryder de amigos') => {
  escribe(screen.getByTestId('campo-nombre'), nombre);
  escribe(document.querySelector('#startDate'), '2030-06-01');
  escribe(document.querySelector('#endDate'), '2030-06-03');
};

/** España, Francia de adyacente y Portugal de tercero, cada uno con un campo. */
const eligeLosTresPaises = async () => {
  fireEvent.click(screen.getByText('elegir ES'));
  fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
  escribe(document.querySelector('#adjacentCountry1'), 'FR');
  fireEvent.click(await screen.findByText('create.addThirdCountry'));
  escribe(document.querySelector('#adjacentCountry2'), 'PT');
  fireEvent.click(screen.getByText('campo de ES'));
  fireEvent.click(screen.getByText('campo de FR'));
  fireEvent.click(screen.getByText('campo de PT'));
};

const enviar = () => fireEvent.submit(document.querySelector('form'));

const creada = async () => {
  await waitFor(() =>
    expect(
      composicion.createCompetitionWithGolfCoursesUseCase.execute,
    ).toHaveBeenCalled(),
  );
  return composicion.createCompetitionWithGolfCoursesUseCase.execute.mock
    .calls[0];
};

const editada = async () => {
  await waitFor(() =>
    expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalled(),
  );
  return composicion.updateCompetitionUseCase.execute.mock.calls[0];
};

const RYDER_GUARDADA = {
  id: 'c-1',
  name: 'Ryder guardada',
  team1Name: 'Rojos',
  team2Name: 'Azules',
  startDate: '2030-10-03',
  endDate: '2030-10-05',
  status: 'ACTIVE',
  maxPlayers: 16,
  playMode: 'SCRATCH',
  countries: [{ code: 'ES' }, { code: 'FR' }],
  visibility: 'PUBLIC',
  tournamentType: 'RYDER_CUP',
  setupMode: 'MANUAL',
  hasTeams: true,
  maxPlayingHandicap: 20,
  enrolledCount: 3,
};

const MEDAL_GUARDADO = {
  id: 'c-1',
  name: 'Medal de octubre',
  maxPlayers: 40,
  status: 'ACTIVE',
  tournamentType: 'MEDAL',
  hasTeams: false,
  startDate: '2030-10-10',
  endDate: '2030-10-12',
  playMode: 'HANDICAP',
  visibility: 'PRIVATE',
  countries: [{ code: 'ES' }],
  strokePlay: {
    categoryLimits: [12],
    categoryCount: null,
    maxMatchdaysPerPlayer: 1,
    overallStanding: 'ACCUMULATED',
  },
};

const abreLaEdicion = async (competicion = RYDER_GUARDADA) => {
  composicion.getCompetitionDetailUseCase.execute.mockResolvedValue(
    competicion,
  );
  renderEn('/competitions/c-1/edit');
  await waitFor(() =>
    expect(screen.getByTestId('campo-nombre')).toHaveValue(competicion.name),
  );
};

/** Deja correr las promesas pendientes sin mover el reloj. */
const dejaCorrerLasPromesas = () =>
  act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });

describe('CreateCompetition · lo que se envía y lo que pasa después (caracterización)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    correo.sinVerificar = false;
    correo.confirma = vi.fn(async () => true);
    idioma.actual = 'es';
    USUARIO.user = { id: 'u-1', gender: 'MALE' };
    USUARIO.loading = false;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValidar.mockImplementation(() => null);
    composicion.fetchCountriesUseCase.execute.mockResolvedValue(PAISES);
    composicion.getAdjacentCountriesUseCase.execute.mockImplementation(
      async (code) => (VECINOS[code] ?? []).map(pais),
    );
    composicion.getCompetitionGolfCoursesUseCase.execute.mockResolvedValue([]);
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue(
      { competition: { id: 'nueva' }, successCount: 3, failedCourses: [] },
    );
    composicion.updateCompetitionUseCase.execute.mockResolvedValue({});
    composicion.configureScheduleUseCase.execute.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('EN1: una Ryder privada con dos adyacentes y tope 18, la petición entera', async () => {
    await abreElAlta();
    rellenaLoBasico();
    await eligeLosTresPaises();
    fireEvent.click(screen.getByTestId('mas-opciones'));
    escribe(screen.getByTestId('campo-equipo-1'), 'Rojos ');
    escribe(screen.getByTestId('campo-handicap'), '18');
    enviar();

    const [carga, campos] = await creada();
    expect(carga).toEqual({
      name: 'Ryder de amigos',
      start_date: '2030-06-01',
      end_date: '2030-06-03',
      main_country: 'ES',
      countries: ['FR', 'PT'],
      play_mode: 'HANDICAP',
      visibility: 'PRIVATE',
      number_of_players: CUPO_POR_DEFECTO,
      team_1_name: 'Rojos',
      team_2_name: 'create.defaultTeamTwo',
      setup_mode: 'RYDER_CUP',
      tournament_type: 'RYDER_CUP',
      max_playing_handicap: 18,
    });
    expect(campos).toEqual([
      { id: 'ES-1', name: 'Campo ES-1' },
      { id: 'FR-1', name: 'Campo FR-1' },
      { id: 'PT-1', name: 'Campo PT-1' },
    ]);
    await waitFor(() =>
      expect(composicion.configureScheduleUseCase.execute).toHaveBeenCalledWith(
        'nueva',
        agendaPropuesta('2030-06-01', '2030-06-03'),
      ),
    );
  });

  it('EN2: un Medal manda sus ajustes y si juega el organizador; ni equipos ni modo', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico('Medal de junio');
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('campo de ES'));
    enviar();

    const [carga] = await creada();
    expect(carga).toEqual({
      name: 'Medal de junio',
      start_date: '2030-06-01',
      end_date: '2030-06-03',
      main_country: 'ES',
      countries: [],
      play_mode: 'HANDICAP',
      visibility: 'PRIVATE',
      number_of_players: CUPO_POR_DEFECTO,
      tournament_type: 'MEDAL',
      stroke_play: ajustesParaCrear(formularioDeAjustes(null)),
      organizer_plays: true,
      max_playing_handicap: null,
    });
    await dejaCorrerLasPromesas();
    expect(composicion.configureScheduleUseCase.execute).not.toHaveBeenCalled();
  });

  it('EN3a: editar una Ryder no manda el tipo, ni stroke_play, ni organizer_plays', async () => {
    await abreLaEdicion();
    enviar();

    expect(await editada()).toEqual([
      'c-1',
      {
        name: 'Ryder guardada',
        start_date: '2030-10-03',
        end_date: '2030-10-05',
        main_country: 'ES',
        countries: ['FR'],
        play_mode: 'SCRATCH',
        visibility: 'PUBLIC',
        number_of_players: 16,
        team_1_name: 'Rojos',
        team_2_name: 'Azules',
        setup_mode: 'MANUAL',
        max_playing_handicap: 20,
      },
    ]);
    expect(
      composicion.updateStrokePlaySettingsUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('EN3b: editar un Medal sin tocar sus ajustes, solo lo general', async () => {
    await abreLaEdicion(MEDAL_GUARDADO);
    enviar();

    expect(await editada()).toEqual([
      'c-1',
      {
        name: 'Medal de octubre',
        start_date: '2030-10-10',
        end_date: '2030-10-12',
        main_country: 'ES',
        countries: [],
        play_mode: 'HANDICAP',
        visibility: 'PRIVATE',
        number_of_players: 40,
        max_playing_handicap: null,
      },
    ]);
    await dejaCorrerLasPromesas();
    expect(
      composicion.updateStrokePlaySettingsUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['', null],
    ['18.7', 18],
  ])('EN4: el tope «%s» se manda como %s', async (escrito, enviado) => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    fireEvent.click(screen.getByTestId('mas-opciones'));
    escribe(screen.getByTestId('campo-handicap'), '20');
    escribe(screen.getByTestId('campo-handicap'), escrito);
    enviar();

    const [carga] = await creada();
    expect(carga.max_playing_handicap).toBe(enviado);
  });

  it('EN5a: el cupo en blanco al crear es el de por defecto', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    escribe(screen.getByTestId('campo-jugadores'), '');
    enviar();

    const [carga] = await creada();
    expect(carga.number_of_players).toBe(CUPO_POR_DEFECTO);
  });

  it('EN5b: el cupo en blanco al editar es el que se cargó', async () => {
    await abreLaEdicion();
    escribe(screen.getByTestId('campo-jugadores'), '');
    enviar();

    const [, carga] = await editada();
    expect(carga.number_of_players).toBe(16);
  });

  it('EN6: tras crear, a la ficha nueva a los 1500 ms y no antes', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    enviar();
    await dejaCorrerLasPromesas();

    expect(
      composicion.createCompetitionWithGolfCoursesUseCase.execute,
    ).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1499));
    expect(screen.getByTestId('donde')).toHaveTextContent(
      '/competitions/create',
    );
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('donde')).toHaveTextContent(
      '/competitions/nueva',
    );
    expect(screen.getByTestId('ficha')).toHaveTextContent('nueva');
  });

  it('EN7: tras editar, a la ficha a los 1000 ms y no antes', async () => {
    await abreLaEdicion();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    enviar();
    await dejaCorrerLasPromesas();

    expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('edit.success');
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByTestId('donde')).toHaveTextContent(
      '/competitions/c-1/edit',
    );
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('donde')).toHaveTextContent('/competitions/c-1');
    expect(screen.getByTestId('ficha')).toHaveTextContent('c-1');
  });

  it('EN8: desmontado antes del temporizador, no navega', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    enviar();
    await dejaCorrerLasPromesas();
    expect(mockToast.success).toHaveBeenCalledWith('create.success');

    fireEvent.click(screen.getByText('desmontar'));
    act(() => vi.advanceTimersByTime(5000));

    expect(screen.getByTestId('donde')).toHaveTextContent(
      '/competitions/create',
    );
  });

  it.each([
    [
      'todos los campos entran',
      { successCount: 2, failedCourses: [] },
      'success',
      'create.success',
    ],
    [
      'algunos no entran',
      { successCount: 1, failedCourses: ['Campo A', 'Campo B'] },
      'warning',
      'create.partialSuccess {"success":1,"failed":2,"courses":"Campo A, Campo B"}',
    ],
    [
      'no entra ninguno',
      { successCount: 0, failedCourses: ['Campo A'] },
      'error',
      'create.errorAddingCourses',
    ],
  ])('EN9: %s', async (_caso, resultado, tipo, texto) => {
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue(
      { competition: { id: 'nueva' }, ...resultado },
    );
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    enviar();

    await waitFor(() => expect(mockToast[tipo]).toHaveBeenCalledWith(texto));
    for (const otro of ['success', 'warning', 'error'].filter(
      (o) => o !== tipo,
    )) {
      expect(mockToast[otro]).not.toHaveBeenCalled();
    }
  });

  it('EN10: «Cancelar» vuelve a la lista', async () => {
    await abreElAlta('MEDAL');
    fireEvent.click(screen.getByRole('button', { name: 'create.cancel' }));

    expect(screen.getByTestId('donde')).toHaveTextContent(/^\/competitions$/);
  });

  it('EN11a: mientras se crea, «creando» y deshabilitado', async () => {
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockReturnValue(
      new Promise(() => {}),
    );
    await abreElAlta('MEDAL');
    expect(
      screen.getByRole('button', { name: 'create.createCompetition' }),
    ).toBeEnabled();
    rellenaLoBasico();
    enviar();

    expect(
      await screen.findByRole('button', { name: 'create.creating' }),
    ).toBeDisabled();
  });

  it('EN11b: mientras se edita, «actualizando» y deshabilitado', async () => {
    composicion.updateCompetitionUseCase.execute.mockReturnValue(
      new Promise(() => {}),
    );
    await abreLaEdicion();
    expect(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    ).toBeEnabled();
    enviar();

    expect(
      await screen.findByRole('button', { name: 'edit.updating' }),
    ).toBeDisabled();
  });

  it('EN12: sin campos en algún país, los nombra en el idioma activo (también los que solo son vecinos)', async () => {
    idioma.actual = 'en';
    mockValidar.mockImplementation((_formulario, opciones) =>
      opciones
        ? {
            key: 'golfCoursesRequired',
            missingCourseCountryCodes: ['FR', 'AD'],
          }
        : null,
    );
    await abreElAlta();
    rellenaLoBasico();
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    escribe(document.querySelector('#adjacentCountry1'), 'FR');
    await screen.findByText('create.addThirdCountry');
    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'create.errors.golfCoursesRequired {"countries":"FR:en, AD:en"}',
    );
    expect(
      composicion.createCompetitionWithGolfCoursesUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('EN13: escribir quita el aviso; el adyacente no, el tercer país sí', async () => {
    mockValidar.mockImplementation((_formulario, opciones) =>
      opciones ? { key: 'datesRequired' } : null,
    );
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    escribe(document.querySelector('#adjacentCountry1'), 'PT');
    fireEvent.click(await screen.findByText('create.addThirdCountry'));

    enviar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    escribe(screen.getByTestId('campo-nombre'), 'Otra');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    enviar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    escribe(document.querySelector('#adjacentCountry1'), 'FR');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('create.addThirdCountry'));
    escribe(document.querySelector('#adjacentCountry2'), 'PT');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('EN14a: mientras carga la edición, «edit.loading»', async () => {
    composicion.getCompetitionDetailUseCase.execute.mockReturnValue(
      new Promise(() => {}),
    );
    renderEn('/competitions/c-1/edit');

    expect(await screen.findByTestId('cargando')).toHaveTextContent(
      'edit.loading',
    );
    expect(screen.queryByTestId('campo-nombre')).not.toBeInTheDocument();
  });

  it('EN14b: mientras carga la sesión, el texto común', () => {
    USUARIO.loading = true;
    renderEn('/competitions/create');

    expect(screen.getByTestId('cargando')).toHaveTextContent('common:loading');
  });

  it('EN14c: sin usuario no pinta nada', async () => {
    USUARIO.user = null;
    renderEn('/competitions/create');
    await dejaCorrerLasPromesas();

    expect(screen.queryByTestId('cargando')).not.toBeInTheDocument();
    expect(screen.queryByTestId('titulo-pantalla')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tipo-RYDER_CUP')).not.toBeInTheDocument();
  });
  describe('D: un solo envío a la vez', () => {
    const botonDeCrear = () =>
      screen.getByRole('button', {
        name: /^create\.(createCompetition|creating)$/,
      });
    const botonDeEditar = () =>
      screen.getByRole('button', {
        name: /^edit\.(updateCompetition|updating)$/,
      });

    it('D1: tras crear, el botón sigue en «creando» y deshabilitado hasta ir a la ficha; otro envío no manda nada', async () => {
      await abreElAlta('MEDAL');
      rellenaLoBasico();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      enviar();
      await dejaCorrerLasPromesas();
      expect(mockToast.success).toHaveBeenCalledWith('create.success');

      expect(botonDeCrear()).toHaveTextContent('create.creating');
      expect(botonDeCrear()).toBeDisabled();
      enviar();
      await dejaCorrerLasPromesas();
      expect(
        composicion.createCompetitionWithGolfCoursesUseCase.execute,
      ).toHaveBeenCalledTimes(1);

      act(() => vi.advanceTimersByTime(1500));
      expect(screen.getByTestId('donde')).toHaveTextContent(
        '/competitions/nueva',
      );
    });

    it('D2: tras editar, igual hasta ir a la ficha', async () => {
      await abreLaEdicion();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      enviar();
      await dejaCorrerLasPromesas();
      expect(mockToast.success).toHaveBeenCalledWith('edit.success');

      expect(botonDeEditar()).toHaveTextContent('edit.updating');
      expect(botonDeEditar()).toBeDisabled();
      enviar();
      await dejaCorrerLasPromesas();
      expect(
        composicion.updateCompetitionUseCase.execute,
      ).toHaveBeenCalledTimes(1);

      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByTestId('donde')).toHaveTextContent(
        /^\/competitions\/c-1$/,
      );
    });

    it('D3a: si crear falla, el botón vuelve para reintentar', async () => {
      composicion.createCompetitionWithGolfCoursesUseCase.execute.mockRejectedValueOnce(
        new Error('caído'),
      );
      await abreElAlta('MEDAL');
      rellenaLoBasico();
      enviar();
      await waitFor(() => expect(mockToast.error).toHaveBeenCalled());

      expect(botonDeCrear()).toHaveTextContent('create.createCompetition');
      expect(botonDeCrear()).toBeEnabled();
      enviar();
      await waitFor(() =>
        expect(
          composicion.createCompetitionWithGolfCoursesUseCase.execute,
        ).toHaveBeenCalledTimes(2),
      );
    });

    it('D3b: si editar falla, el botón vuelve para reintentar', async () => {
      composicion.updateCompetitionUseCase.execute.mockRejectedValueOnce(
        new Error('caído'),
      );
      await abreLaEdicion();
      enviar();
      await waitFor(() => expect(mockToast.error).toHaveBeenCalled());

      expect(botonDeEditar()).toHaveTextContent('edit.updateCompetition');
      expect(botonDeEditar()).toBeEnabled();
      enviar();
      await waitFor(() =>
        expect(
          composicion.updateCompetitionUseCase.execute,
        ).toHaveBeenCalledTimes(2),
      );
    });

    it('D3c: si falla la segunda petición de la edición, el botón vuelve para reintentar', async () => {
      composicion.updateStrokePlaySettingsUseCase.execute.mockRejectedValueOnce(
        Object.assign(new Error('motivo del servidor'), { status: 400 }),
      );
      await abreLaEdicion(MEDAL_GUARDADO);
      // Más días y más jornadas: primero lo general, y fallan los ajustes
      escribe(document.querySelector('#endDate'), '2030-10-13');
      escribe(screen.getByLabelText('create.strokePlay.matchdays'), '4');
      enviar();
      expect(
        await screen.findByText(
          'edit.strokePlayNotSaved {"motivo":"motivo del servidor"}',
        ),
      ).toBeInTheDocument();

      expect(botonDeEditar()).toHaveTextContent('edit.updateCompetition');
      expect(botonDeEditar()).toBeEnabled();
    });

    it('D4: dos envíos seguidos, antes de que acabe el primero, mandan uno', async () => {
      composicion.createCompetitionWithGolfCoursesUseCase.execute.mockReturnValue(
        new Promise(() => {}),
      );
      await abreElAlta('MEDAL');
      rellenaLoBasico();
      const formulario = document.querySelector('form');
      act(() => {
        fireEvent.submit(formulario);
        fireEvent.submit(formulario);
      });
      await dejaCorrerLasPromesas();

      expect(
        composicion.createCompetitionWithGolfCoursesUseCase.execute,
      ).toHaveBeenCalledTimes(1);
    });

    it('D4: en una pública, dos «crear» del modal de la apertura mandan uno', async () => {
      composicion.createCompetitionWithGolfCoursesUseCase.execute.mockReturnValue(
        new Promise(() => {}),
      );
      await abreElAlta('MEDAL');
      rellenaLoBasico();
      fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
      enviar();
      const crear = await screen.findByTestId('confirmar-apertura');
      act(() => {
        crear.click();
        crear.click();
      });
      await dejaCorrerLasPromesas();

      expect(
        composicion.createCompetitionWithGolfCoursesUseCase.execute,
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('D5: dos envíos seguidos con la copia sin verificar preguntan una vez', async () => {
    correo.sinVerificar = true;
    correo.confirma = vi.fn(() => new Promise(() => {}));
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    const formulario = document.querySelector('form');
    act(() => {
      fireEvent.submit(formulario);
      fireEvent.submit(formulario);
    });
    await dejaCorrerLasPromesas();

    expect(correo.confirma).toHaveBeenCalledTimes(1);
  });

  it('D5: dos envíos seguidos de una pública validan y piden la apertura una vez', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
    const formulario = document.querySelector('form');
    const validacionesDelEnvio = () =>
      mockValidar.mock.calls.filter((llamada) => llamada.length > 1).length;
    act(() => {
      fireEvent.submit(formulario);
      fireEvent.submit(formulario);
    });
    await dejaCorrerLasPromesas();

    expect(validacionesDelEnvio()).toBe(1);
    expect(screen.getAllByTestId('confirmar-apertura')).toHaveLength(1);
  });

  it('D5: cerrada la pregunta de la apertura sin crear, se puede volver a enviar', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
    enviar();
    await screen.findByTestId('confirmar-apertura');
    fireEvent.click(screen.getByTestId('volver-al-formulario'));
    expect(screen.queryByTestId('confirmar-apertura')).toBeNull();

    enviar();

    expect(await screen.findByTestId('confirmar-apertura')).toBeInTheDocument();
  });

  it('D5: si la validación falla, se puede volver a enviar', async () => {
    mockValidar.mockImplementation((_f, opciones) =>
      opciones ? { key: 'datesRequired' } : null,
    );
    await abreElAlta('MEDAL');
    enviar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    mockValidar.mockImplementation(() => null);
    rellenaLoBasico();

    enviar();

    await waitFor(() =>
      expect(
        composicion.createCompetitionWithGolfCoursesUseCase.execute,
      ).toHaveBeenCalledTimes(1),
    );
  });

  it('D5: si el correo no está verificado, se puede volver a enviar al verificarlo', async () => {
    correo.sinVerificar = true;
    correo.confirma = vi.fn(async () => false);
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    enviar();
    await waitFor(() => expect(correo.confirma).toHaveBeenCalledTimes(1));
    correo.confirma.mockResolvedValue(true);

    enviar();

    await waitFor(() =>
      expect(
        composicion.createCompetitionWithGolfCoursesUseCase.execute,
      ).toHaveBeenCalledTimes(1),
    );
  });

  it('D4: creada una pública y camino de la ficha, otro envío no vuelve a preguntar la apertura', async () => {
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    enviar();
    fireEvent.click(screen.getByTestId('confirmar-apertura'));
    await dejaCorrerLasPromesas();
    expect(mockToast.success).toHaveBeenCalledWith('create.success');
    expect(screen.queryByTestId('confirmar-apertura')).toBeNull();

    enviar();

    expect(screen.queryByTestId('confirmar-apertura')).toBeNull();
  });

  it('E1: si se sale de la página mientras se guarda, al acabar no navega (el aviso sí sale)', async () => {
    let termina;
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockReturnValue(
      new Promise((resolver) => {
        termina = resolver;
      }),
    );
    await abreElAlta('MEDAL');
    rellenaLoBasico();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    enviar();
    await dejaCorrerLasPromesas();
    fireEvent.click(screen.getByText('desmontar'));

    await act(async () => {
      termina({
        competition: { id: 'nueva' },
        successCount: 1,
        failedCourses: [],
      });
    });
    await dejaCorrerLasPromesas();
    act(() => vi.advanceTimersByTime(5000));

    expect(mockToast.success).toHaveBeenCalledWith('create.success');
    expect(screen.getByTestId('donde')).toHaveTextContent(
      '/competitions/create',
    );
  });

  it('F1: si competitionId desaparece sin remontar a mitad de una carga, la espera se apaga', async () => {
    composicion.getCompetitionDetailUseCase.execute.mockReturnValue(
      new Promise(() => {}),
    );
    renderEn('/competitions/c-1/edit');
    expect(await screen.findByTestId('cargando')).toHaveTextContent(
      'edit.loading',
    );

    fireEvent.click(screen.getByText('ir al alta'));

    expect(await screen.findByTestId('tipo-RYDER_CUP')).toBeInTheDocument();
    expect(screen.queryByTestId('cargando')).not.toBeInTheDocument();
  });
});
