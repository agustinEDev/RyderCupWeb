import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * LA TABLA de la FE #639, en la pantalla: el tipo se elige ANTES de rellenar
 * nada, y elegir Ryder Cup tiene que llevar exactamente al formulario de hoy.
 * Esta issue añade un paso delante; no cambia nada detrás.
 *
 *   #   caso                                  | qué pasa
 *   ----|----------------------------------------|------------------------
 *   1   se entra a crear competición            | sale el tipo, NO el formulario
 *   2   se elige Ryder Cup                      | sale el formulario de siempre
 *   3   se vuelve atrás                         | otra vez el tipo…
 *   4   …y se vuelve a entrar                   | …con lo escrito intacto
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
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
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name: 'España' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));

vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

const pinta = () => render(<MemoryRouter><CreateCompetition /></MemoryRouter>);

const pintaEdicion = () => render(
  <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
    <Routes>
      <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
    </Routes>
  </MemoryRouter>
);

describe('CreateCompetition · elegir el tipo primero (FE #639)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('1: al entrar se pregunta el tipo, no se enseña el formulario', async () => {
    pinta();

    expect(await screen.findByTestId('tipo-RYDER_CUP')).toBeInTheDocument();
    expect(screen.queryByLabelText(/create\.competitionName/)).not.toBeInTheDocument();
  });

  it('2: elegir Ryder Cup lleva al formulario de siempre', async () => {
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));

    expect(await screen.findByText('create.competitionDetails')).toBeInTheDocument();
    expect(screen.queryByTestId('tipo-RYDER_CUP')).not.toBeInTheDocument();
  });

  it('2b: y el formulario empieza por arriba, no por donde se quedó el scroll', async () => {
    // En el móvil la lista de tipos ocupa toda la pantalla y se llega al tercero
    // con scroll. Al elegir, el formulario aparecía por el final: lo primero que
    // veía el organizador era «Límite de Hándicap de Juego». Visto a 360 px
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    pinta();
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));

    await screen.findByText('create.competitionDetails');
    expect(scrollTo).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('3 y 4: volver atrás no cuesta lo escrito', async () => {
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    const nombre = await screen.findByTestId('campo-nombre');
    fireEvent.change(nombre, { target: { value: 'Ryder de los amigos' } });

    fireEvent.click(screen.getByTestId('volver-al-tipo'));
    expect(await screen.findByTestId('tipo-RYDER_CUP')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tipo-RYDER_CUP'));
    expect(await screen.findByTestId('campo-nombre')).toHaveValue('Ryder de los amigos');
  });

  it('5: editando NUNCA se pregunta el tipo, ni aunque falle la carga de países', async () => {
    // `isEditMode` se ponía dentro del efecto que carga la competición, y ese
    // efecto sale antes si los países no han llegado. Sin cobertura —el caso
    // normal de esta aplicación— la pantalla de edición se quedaba enseñando el
    // selector, y al enviar el formulario tomaba la rama de CREAR: una
    // competición nueva en vez de la edición pedida (`/code-review`)
    const { fetchCountriesUseCase } = await import('../composition');
    fetchCountriesUseCase.execute.mockRejectedValueOnce(new Error('sin red'));

    pintaEdicion();

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('tipo-RYDER_CUP')).not.toBeInTheDocument();
    expect(screen.queryByTestId('volver-al-tipo')).not.toBeInTheDocument();
  });
});
