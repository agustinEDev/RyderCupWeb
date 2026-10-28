/**
 * LA TABLA — las tarjetas de «Mis competiciones» (FE #846), aprobada el
 * 13 oct 2026:
 *
 *   #    caso                                  | qué se ve
 *   -----|---------------------------------------|----------------------------------------
 *   9    quién soy                             | el tipo de torneo y «Organizas» o
 *        |                                       | «Juegas», sin la corona; las dos cosas,
 *        |                                       | «Organizas»; pendiente, como antes
 *   10   mi próxima salida                     | «Lun 12 oct · 08:10», o con la sesión
 *        |                                       | si no hay hora; sin ella, nada
 *   11   el campo                              | uno: bandera y nombre, sin repetir el
 *        |                                       | país; varios: «Varios campos»; ninguno
 *        |                                       | (o servidor anterior): el país, como antes
 *   12   jugadores y jornadas                  | «3 / 3 jugadores»; en stroke play,
 *        |                                       | además «2 jornadas»
 *   13   estado y solicitudes pendientes       | como estaban
 *
 * Y lo que añadió la revisión (Agustín, 13 oct):
 *
 *   12c  stroke play sin jornadas (0)          | no se dice «0 jornadas»
 *   14   buscar por el nombre de un campo      | la encuentra, aunque tenga varios
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockList = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: (...a) => mockList(...a) },
}));

// El MISMO objeto en cada render: uno nuevo recrea la carga y no para
const sesion = { user: { id: 'u-1' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u-1' }, clearAuth: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));

const Competitions = (await import('./Competitions')).default;

const competicion = (extra = {}) => ({
  id: 'c-1',
  name: 'Medal de otoño',
  tournamentType: 'MEDAL',
  hasTeams: false,
  status: 'CLOSED',
  startDate: '2026-10-12',
  endDate: '2026-10-13',
  creatorId: 'otro',
  enrollment_status: 'APPROVED',
  pending_enrollments_count: 0,
  enrolledCount: 3,
  maxPlayers: 3,
  countries: [{ code: 'ES', name: 'Spain', nameEn: 'Spain', nameEs: 'España', name_en: 'Spain', name_es: 'España' }],
  location: 'Spain',
  golfCourses: [{ id: 'gc-1', name: 'El Prat', countryCode: 'ES' }],
  playingDays: 2,
  myNextSession: null,
  ...extra,
});

const tarjeta = async (lista) => {
  mockList.mockResolvedValue(lista);
  render(<MemoryRouter><Competitions /></MemoryRouter>);
  return screen.findAllByTestId('tarjeta-competicion');
};

describe('Mis competiciones · tarjetas (FE #846)', () => {
  beforeEach(() => {
    mockList.mockReset();
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  });

  it('9 · el tipo de torneo en cada tarjeta', async () => {
    const [medal, ryder] = await tarjeta([
      competicion(),
      competicion({ id: 'c-2', name: 'Ryder', tournamentType: 'RYDER_CUP', hasTeams: true }),
    ]);

    expect(within(medal).getByTestId('tipo-de-torneo')).toHaveTextContent('create.type.MEDAL.title');
    expect(within(ryder).getByTestId('tipo-de-torneo')).toHaveTextContent('create.type.RYDER_CUP.title');
  });

  it('9b · la organizo (y juego): «Organizas», sin corona', async () => {
    const [mia] = await tarjeta([competicion({ creatorId: 'u-1', enrollment_status: 'APPROVED' })]);

    expect(within(mia).getByTestId('mi-papel')).toHaveTextContent('myCompetitions.youOrganise');
    expect(within(mia).queryByTitle('myCompetitions.youAreTheCreator')).not.toBeInTheDocument();
  });

  it('9c · juego en la de otro: «Juegas», en lugar de «Inscripción: aprobada»', async () => {
    const [ajena] = await tarjeta([competicion()]);

    expect(within(ajena).getByTestId('mi-papel')).toHaveTextContent('myCompetitions.youPlay');
    expect(within(ajena).queryByText(/myCompetitions\.enrollmentStatus/)).not.toBeInTheDocument();
  });

  it('9d · pendiente de aprobar: la inscripción, como antes', async () => {
    const [ajena] = await tarjeta([competicion({ enrollment_status: 'PENDING' })]);

    expect(within(ajena).queryByTestId('mi-papel')).not.toBeInTheDocument();
    expect(within(ajena).getByText(/myCompetitions\.enrollmentStatus/)).toBeInTheDocument();
  });

  it('10 · mi próxima salida, con su hora', async () => {
    const [c] = await tarjeta([competicion({ myNextSession: { date: '2026-10-12', sessionType: 'MORNING', teeTime: '08:10' } })]);

    expect(within(c).getByTestId('proxima-salida')).toHaveTextContent('myCompetitions.nextSession {"cuando":"Lun 12 oct · 08:10"}');
  });

  it('10b · sin hora todavía: el día y la sesión', async () => {
    const [c] = await tarjeta([
      competicion({ myNextSession: { date: '2026-10-12', sessionType: 'AFTERNOON', teeTime: null } }),
    ]);

    expect(within(c).getByTestId('proxima-salida')).toHaveTextContent(
      'myCompetitions.nextSession {"cuando":"Lun 12 oct · sessions.AFTERNOON"}'
    );
  });

  it('10c · sin próxima salida, no se dice nada', async () => {
    const [c] = await tarjeta([competicion()]);

    expect(within(c).queryByTestId('proxima-salida')).not.toBeInTheDocument();
  });

  it('11 · un campo: su nombre con su bandera, y el país no se repite', async () => {
    const [c] = await tarjeta([competicion()]);

    expect(within(c).getByTestId('donde')).toHaveTextContent('El Prat');
    expect(within(c).getByTestId('donde').querySelectorAll('[data-testid="bandera"]')).toHaveLength(1);
    expect(within(c).queryByText('Spain')).not.toBeInTheDocument();
    expect(within(c).queryByText('España')).not.toBeInTheDocument();
  });

  it('11b · varios campos: «Varios campos», con la bandera de cada país una vez', async () => {
    const [c] = await tarjeta([
      competicion({
        golfCourses: [
          { id: 'gc-1', name: 'El Prat', countryCode: 'ES' },
          { id: 'gc-2', name: 'Golf Meis', countryCode: 'ES' },
          { id: 'gc-3', name: 'Penha Longa', countryCode: 'PT' },
        ],
      }),
    ]);

    expect(within(c).getByTestId('donde')).toHaveTextContent('myCompetitions.severalCourses');
    expect(within(c).getByTestId('donde').querySelectorAll('[data-testid="bandera"]')).toHaveLength(2);
    expect(within(c).queryByText('El Prat')).not.toBeInTheDocument();
  });

  it('11c · sin campos todavía (o un servidor anterior): el país, como antes', async () => {
    const [vacia, antigua] = await tarjeta([
      competicion({ golfCourses: [] }),
      competicion({ id: 'c-2', golfCourses: null }),
    ]);

    expect(within(vacia).getByTestId('donde')).toHaveTextContent('España');
    expect(within(antigua).getByTestId('donde')).toHaveTextContent('España');
  });

  it('12 · stroke play: jugadores y jornadas', async () => {
    const [dos, una] = await tarjeta([competicion(), competicion({ id: 'c-2', playingDays: 1 })]);

    expect(within(dos).getByTestId('jugadores')).toHaveTextContent('myCompetitions.players {"count":3,"max":3}');
    expect(within(dos).getByTestId('jugadores')).toHaveTextContent('myCompetitions.playingDays {"count":2}');
    expect(within(una).getByTestId('jugadores')).toHaveTextContent('myCompetitions.playingDays {"count":1}');
  });

  it('12b · Ryder (o sin el dato): sin jornadas', async () => {
    const [ryder, sinDato] = await tarjeta([
      competicion({ tournamentType: 'RYDER_CUP', hasTeams: true, playingDays: null }),
      competicion({ id: 'c-2', playingDays: null }),
    ]);

    expect(within(ryder).getByTestId('jugadores')).not.toHaveTextContent('playingDays');
    expect(within(sinDato).getByTestId('jugadores')).not.toHaveTextContent('playingDays');
  });

  it('12c · sin jornadas todavía (0): no se dice «0 jornadas»', async () => {
    const [c] = await tarjeta([competicion({ playingDays: 0 })]);

    expect(within(c).getByTestId('jugadores')).not.toHaveTextContent('playingDays');
  });

  it('14 · se busca también por el nombre del campo, aunque tenga varios', async () => {
    await tarjeta([
      competicion({ name: 'Liga de otoño' }),
      competicion({
        id: 'c-2',
        name: 'Gira',
        golfCourses: [
          { id: 'gc-2', name: 'Golf Meis', countryCode: 'ES' },
          { id: 'gc-3', name: 'Penha Longa', countryCode: 'PT' },
        ],
      }),
    ]);

    fireEvent.change(screen.getByPlaceholderText('myCompetitions.searchPlaceholder'), { target: { value: 'penha' } });

    const quedan = screen.getAllByTestId('tarjeta-competicion');
    expect(quedan).toHaveLength(1);
    expect(within(quedan[0]).getByText('Gira')).toBeInTheDocument();
  });

  it('13 · el estado y las solicitudes pendientes siguen', async () => {
    const [c] = await tarjeta([competicion({ creatorId: 'u-1', pending_enrollments_count: 2 })]);

    expect(within(c).getByText('status.CLOSED')).toBeInTheDocument();
    expect(within(c).getByText(/myCompetitions\.pendingRequests/)).toBeInTheDocument();
  });

  // QA del 26 oct (FE #938): a 800 px la página deja ~215 px por tarjeta y el
  // estado, al lado, partía el título a mitad de palabra («Privacida d»). El
  // título se guarda un mínimo y, si no cabe con el estado, este baja de línea
  it('14 · sin sitio para los dos, el estado baja de línea en vez de partir el título', async () => {
    const [c] = await tarjeta([competicion({ name: 'QA1021 Enrol Privacidad' })]);

    const titulo = within(c).getByRole('heading', { name: 'QA1021 Enrol Privacidad' });
    const bloque = titulo.parentElement;
    const cabecera = bloque.parentElement;
    expect(cabecera.className.split(' ')).toContain('flex-wrap');
    expect(bloque.className.split(' ')).toEqual(expect.arrayContaining(['min-w-0', 'flex-[1_1_10rem]']));
    expect(within(cabecera).getByText('status.CLOSED').className.split(' ')).toContain('shrink-0');
  });
});
