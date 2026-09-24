import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * La agenda se propone al crear la competición (FE #654).
 *
 * El torneo es su agenda, y la app ya sabe las fechas: en vez de dejar al
 * organizador treinta campos por delante, se propone una —parejas los primeros
 * días, individuales el último— que luego cambia en la ficha.
 *
 *   #    caso                                             | qué pasa
 *   -----|------------------------------------------------|-----------------------------
 *   AP1  estilo Ryder, con su campo                       | se propone: 3 días, 5 sesiones
 *   AP2  modo manual                                      | no: ahí lo decide todo él
 *   AP3  sin ningún campo añadido                         | no: el servidor no puede
 *   AP4  la propuesta falla                               | la competición queda creada igual, sin error
 */
// El `t` de los tests interpola: el resumen plegado ES sus variables, y un `t`
// que devuelva solo la clave deja pasar un resumen escrito a pelo
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores ? `${clave} ${Object.values(valores).join(' ')}` : clave,
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
  configureScheduleUseCase: { execute: vi.fn() },
}));

// Lo que se prueba aquí es el modo, no el formulario: sin esto haría falta
// elegir país y campos para poder enviar, como en los demás tests de esta pantalla
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: () => null,
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

const pinta = () => render(<MemoryRouter><CreateCompetition /></MemoryRouter>);

const { createCompetitionWithGolfCoursesUseCase, configureScheduleUseCase } =
  await import('../composition');
const customToast = (await import('../utils/toast')).default;

const elegirTipoYModo = async (modo = 'RYDER_CUP') => {
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  fireEvent.click(await screen.findByTestId(`modo-${modo}`));
};

// Con el `name` del campo: el manejador lee `e.target.name`, y sin él el
// formulario se queda vacío y no llega a enviarse
const rellenarMinimo = () => {
  fireEvent.change(screen.getByLabelText(/create\.competitionName/), {
    target: { name: 'competitionName', value: 'Ryder de los amigos' },
  });
  fireEvent.change(screen.getByLabelText(/create\.startDate/), {
    target: { name: 'startDate', value: '2030-06-01' },
  });
  fireEvent.change(screen.getByLabelText(/create\.endDate/), {
    target: { name: 'endDate', value: '2030-06-03' },
  });
};

describe('CreateCompetition · la agenda propuesta (FE #654)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue({
      competition: { id: 'c-nueva' },
      successCount: 1,
      failedCourses: [],
    });
    configureScheduleUseCase.execute.mockResolvedValue({ rounds_created: 5 });
  });

  const crear = async (modo) => {
    pinta();
    await elegirTipoYModo(modo);
    rellenarMinimo();
    fireEvent.click(screen.getByRole('button', { name: 'create.createCompetition' }));
    await vi.waitFor(() => expect(createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
  };

  it('AP1: al estilo Ryder, con su campo, se propone la agenda de esos días', async () => {
    await crear('RYDER_CUP');

    await vi.waitFor(() =>
      expect(configureScheduleUseCase.execute).toHaveBeenCalledWith('c-nueva', {
        mode: 'AUTOMATIC',
        total_sessions: 5,
        sessions_per_day: 2,
      })
    );
  });

  it('AP2: en modo manual no se propone nada', async () => {
    await crear('MANUAL');

    await new Promise((r) => setTimeout(r, 50));
    expect(configureScheduleUseCase.execute).not.toHaveBeenCalled();
  });

  it('AP3: sin ningún campo añadido tampoco', async () => {
    createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue({
      competition: { id: 'c-nueva' },
      successCount: 0,
      failedCourses: [],
    });
    await crear('RYDER_CUP');

    await new Promise((r) => setTimeout(r, 50));
    expect(configureScheduleUseCase.execute).not.toHaveBeenCalled();
  });

  it('AP4: si la propuesta falla, la competición queda creada y no se dice que falló el alta', async () => {
    configureScheduleUseCase.execute.mockRejectedValue(new Error('caído'));
    await crear('RYDER_CUP');

    await vi.waitFor(() => expect(configureScheduleUseCase.execute).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(customToast.success).toHaveBeenCalledWith('create.success');
    expect(customToast.error).not.toHaveBeenCalled();
  });
});
