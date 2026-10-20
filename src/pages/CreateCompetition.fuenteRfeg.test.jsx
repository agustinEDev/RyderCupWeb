import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GolfCourse from '../domain/entities/GolfCourse';

/**
 * Auditoría legal del 20 oct 2026 (F3): al elegir campos para una competición,
 * si alguno es federado una línea discreta dice de dónde salen sus datos.
 *
 *   caso                                   | qué se ve
 *   ---------------------------------------|---------------------------
 *   sin campos elegidos                    | nada
 *   un campo dado de alta a mano           | nada
 *   un campo de la RFEG                    | «Datos de campos federados: RFEG»
 *   se quita el campo de la RFEG           | la línea se va
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
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
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

const CAMPO_RFEG = new GolfCourse({ id: 'gc-1', name: 'Real Club de Golf', provenance: { source: 'RFEG' } });
const CAMPO_MANUAL = new GolfCourse({ id: 'gc-2', name: 'Pitch and putt', provenance: { source: 'MANUAL' } });

vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <div>
      <button type="button" onClick={() => onCourseSelect(CAMPO_RFEG)}>elegir RFEG</button>
      <button type="button" onClick={() => onCourseSelect(CAMPO_MANUAL)}>elegir manual</button>
    </div>
  ),
}));

const CreateCompetition = (await import('./CreateCompetition')).default;

const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
  await act(async () => { await Promise.resolve(); });
  fireEvent.click(screen.getByText('elegir país'));
  await screen.findByText('elegir RFEG');
};

describe('CreateCompetition · fuente de los datos de los campos (F3)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sin campos elegidos no se cita a nadie', async () => {
    await abreElFormulario();

    expect(screen.queryByText('source.federatedData')).toBeNull();
  });

  it('un campo manual tampoco', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByText('elegir manual'));

    expect(screen.getByText(CAMPO_MANUAL.name)).toBeInTheDocument();
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });

  it('un campo de la RFEG se cita, con su enlace', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByText('elegir RFEG'));

    expect(screen.getByText('source.federatedData')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'source.rfegShort' })).toHaveAttribute('href', 'https://www.rfegolf.es');
  });

  it('al quitar el campo de la RFEG, la cita se va', async () => {
    await abreElFormulario();
    fireEvent.click(screen.getByText('elegir RFEG'));
    fireEvent.click(screen.getByText('elegir manual'));

    fireEvent.click(screen.getByRole('button', { name: `detail.golfCourses.remove ${CAMPO_RFEG.name}` }));

    expect(screen.getByText(CAMPO_MANUAL.name)).toBeInTheDocument();
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });
});
