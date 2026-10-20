import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Auditoría legal del 20 oct 2026 (F3): al elegir campos para una competición,
 * si alguno es federado una línea discreta dice de dónde salen sus datos.
 *
 * Revisión (B2): el buscador NO devuelve entidades hechas a mano. Devuelve lo
 * que sale del repositorio real a partir del JSON del listado, con la
 * `provenance` que el backend va a añadir al resumen de cada campo (es el
 * contrato que tendrá la API). Al editar no se pintan los campos, así que
 * tampoco la cita.
 *
 *   caso                                        | qué se ve
 *   --------------------------------------------|---------------------------
 *   sin campos elegidos                         | nada
 *   un campo del listado con origen MANUAL      | nada
 *   un campo del listado sin procedencia        | nada (la API de hoy)
 *   un campo del listado con origen RFEG        | «Datos de campos federados: RFEG»
 *   se quita el campo de la RFEG                | la línea se va
 *   edición (cualquier procedencia)             | nada: no se pinta la sección de campos
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores && typeof valores === 'object'
        ? `${clave} ${Object.values(valores).join(' ')}`
        : clave,
    i18n: { language: 'es' },
  }),
}));

const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1', gender: 'MALE' }, loading: false }) }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));
const mockDetalle = vi.fn();
const mockCampos = vi.fn();
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
  // La página descarta los países sin `name_en`/`name_es`, así que con `name` a
  // secas la lista se quedaba vacía y no se podía elegir ninguno
  fetchCountriesUseCase: {
    execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]),
  },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
// La sección de campos de golf solo existe con un país elegido, así que el
// selector tiene que poder elegirlo
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange('ES')}>elegir país</button>
  ),
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

// El listado tal como lo devuelve la API, con la procedencia en cada campo
const resumen = (id, name, provenance) => ({
  id,
  name,
  country_code: 'ES',
  course_type: 'STANDARD_18',
  creator_id: 'u-9',
  tees: [],
  approval_status: 'APPROVED',
  total_par: 72,
  location: null,
  distance_km: null,
  ...(provenance === undefined ? {} : { provenance }),
});
const LISTADO = {
  rfeg: resumen('gc-1', 'Real Club de Golf', { source: 'RFEG', external_id: '77', imported_at: '2026-10-01T00:00:00Z' }),
  manual: resumen('gc-2', 'Pitch and putt', { source: 'MANUAL', external_id: null, imported_at: null }),
  sinProcedencia: resumen('gc-3', 'Campo de siempre', undefined),
};

// La API es lo único falso: repositorio y caso de uso son los de verdad
const mockApi = vi.fn();
vi.mock('../services/api', () => ({ default: (...a) => mockApi(...a) }));
const { default: ApiGolfCourseRepository } = await import('../infrastructure/repositories/ApiGolfCourseRepository');
const { default: ListGolfCoursesUseCase } = await import('../application/use_cases/golf_course/ListGolfCoursesUseCase');
const listar = new ListGolfCoursesUseCase({ golfCourseRepository: new ApiGolfCourseRepository() });

const elegir = async (clave, onCourseSelect) => {
  mockApi.mockResolvedValueOnce({ golf_courses: [LISTADO[clave]], total: 1 });
  const { courses } = await listar.execute({ approvalStatus: 'APPROVED' });
  onCourseSelect(courses[0]);
};

vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <div>
      <button type="button" onClick={() => elegir('rfeg', onCourseSelect)}>elegir RFEG</button>
      <button type="button" onClick={() => elegir('manual', onCourseSelect)}>elegir manual</button>
      <button type="button" onClick={() => elegir('sinProcedencia', onCourseSelect)}>elegir sin procedencia</button>
    </div>
  ),
}));

const CreateCompetition = (await import('./CreateCompetition')).default;

const pulsar = async (texto) => {
  await act(async () => { fireEvent.click(screen.getByText(texto)); });
};

const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
  await act(async () => { await Promise.resolve(); });
  fireEvent.click(screen.getByText('elegir país'));
  await screen.findByText('elegir RFEG');
};

describe('CreateCompetition · fuente de los datos de los campos (F3, B2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampos.mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sin campos elegidos no se cita a nadie', async () => {
    await abreElFormulario();

    expect(screen.queryByText('source.federatedData')).toBeNull();
  });

  it.each([
    ['manual', 'Pitch and putt'],
    ['sinProcedencia', 'Campo de siempre'],
  ])('un campo del listado %s no se cita', async (clave, nombre) => {
    await abreElFormulario();

    await pulsar(clave === 'manual' ? 'elegir manual' : 'elegir sin procedencia');

    expect(screen.getByText(nombre)).toBeInTheDocument();
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });

  it('un campo del listado de la RFEG se cita, con su enlace', async () => {
    await abreElFormulario();

    await pulsar('elegir RFEG');

    expect(screen.getByText('Real Club de Golf')).toBeInTheDocument();
    expect(screen.getByText('source.federatedData')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'source.rfegShort' })).toHaveAttribute('href', 'https://www.rfegolf.es');
  });

  it('al quitar el campo de la RFEG, la cita se va', async () => {
    await abreElFormulario();
    await pulsar('elegir RFEG');
    await pulsar('elegir manual');

    fireEvent.click(screen.getByRole('button', { name: 'detail.golfCourses.remove Real Club de Golf' }));

    expect(screen.getByText('Pitch and putt')).toBeInTheDocument();
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });
});

describe('CreateCompetition · la cita al editar (B2)', () => {
  const competicion = {
    id: 'c-1',
    name: 'Campeonato del club',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    status: 'ACTIVE',
    maxPlayers: 12,
    playMode: 'SCRATCH',
    teamAssignment: 'AUTOMATIC',
    countries: [{ code: 'ES' }],
    visibility: 'PRIVATE',
    // Con su modo de montaje: sin él, el formulario vuelve a preguntarlo y aún
    // no pinta los campos
    tournamentType: 'RYDER_CUP',
    setupMode: 'RYDER_CUP',
    hasTeams: true,
  };

  // Lo que devuelve GET /competitions/{id}/golf-courses
  const guardado = (provenance) => [
    {
      golf_course_id: 'gc-1',
      display_order: 1,
      golf_course: {
        id: 'gc-1',
        name: 'Real Club de Golf',
        country_code: 'ES',
        approval_status: 'APPROVED',
        ...(provenance === undefined ? {} : { provenance }),
      },
    },
  ];

  const pintaEdicion = () =>
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Al editar no se pinta la sección de campos (deliberado desde e4f41fd: los
  // campos de una competición creada se gestionan en su ficha). Sin campos a la
  // vista no hay nada que citar: ni siquiera con un campo de la RFEG guardado
  it.each([
    ['de la RFEG', { source: 'RFEG', external_id: '77', imported_at: null }],
    ['sin procedencia (la API de hoy)', undefined],
    ['con origen MANUAL', { source: 'MANUAL' }],
  ])('un campo guardado %s: ni sección de campos ni cita', async (_caso, provenance) => {
    mockDetalle.mockResolvedValueOnce(competicion);
    mockCampos.mockResolvedValueOnce(guardado(provenance));
    pintaEdicion();

    await screen.findByText('edit.updateCompetition');
    await waitFor(() => expect(mockCampos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    expect(screen.queryByText('Real Club de Golf')).toBeNull();
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });
});
