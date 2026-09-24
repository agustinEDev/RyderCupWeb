import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Crear una competición inscribe al organizador como jugador, así que su
 * género hace falta como el de cualquiera (#710, 24 sep). El formulario lo
 * pregunta solo si le falta, y lo guarda ANTES de crearla.
 *
 *   #   caso                                  | qué pasa
 *   ----|--------------------------------------|---------------------------------
 *   C1  sin género, lo elige y crea           | se guarda y luego se crea
 *   C2  sin género y sin elegirlo              | el navegador no lo envía: es obligatorio
 *   C3  con género                            | ni se pregunta ni se toca el perfil
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores ? `${clave} ${Object.values(valores).join(' ')}` : clave,
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1', gender: 'MALE' }, loading: false }) }));
let faltaGenero = true;
const mockGuardarGenero = vi.fn(async () => orden.push('genero'));
vi.mock('../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({ falta: faltaGenero, guardar: mockGuardarGenero }),
}));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));

// La forma que devuelve de verdad `CreateCompetitionWithGolfCoursesUseCase`:
// con solo `{ id }`, el componente revienta al leer `failedCourses.length` y el
// test acaba pasando por el `catch`, dando por buena una creación que falló
const orden = [];
const mockCrear = vi.fn().mockResolvedValue({
  competition: { id: 'c-nueva' },
  successCount: 1,
  failedCourses: [],
});
const mockActualizar = vi.fn().mockResolvedValue({ id: 'c-1' });
const mockDetalle = vi.fn();
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: (...args) => mockCrear(...args) },
  updateCompetitionUseCase: { execute: (...args) => mockActualizar(...args) },
  getCompetitionDetailUseCase: { execute: (...args) => mockDetalle(...args) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));

// Aqui se mira que lo elegido llegue a la peticion, no que el formulario este
// completo: rellenarlo entero por la interfaz obliga a pasar por el buscador de
// campos y el de paises, que estan mockeados. La validacion tiene sus tests
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: () => null,
}));

vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

/** Entra al formulario: el tipo se elige antes (FE #639). */
const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  // Y el modo de configuración, que es el paso siguiente (FE #695). Estilo
  // RyderCup es lo que estas pantallas daban por hecho
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
};

/** Rellena lo imprescindible y envía. */
const rellenaYCrea = async () => {
  fireEvent.change(screen.getByLabelText(/create\.competitionName/), {
    target: { name: 'name', value: 'Ryder de los amigos' },
  });
  fireEvent.change(screen.getByLabelText(/create\.startDate/), {
    target: { name: 'startDate', value: '2027-06-01' },
  });
  fireEvent.change(screen.getByLabelText(/create\.endDate/), {
    target: { name: 'endDate', value: '2027-06-03' },
  });
  fireEvent.click(screen.getByText('create.createCompetition'));
};

describe('CreateCompetition · el género del organizador', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCrear.mockClear();
    mockGuardarGenero.mockClear();
    orden.length = 0;
    mockCrear.mockImplementation(async () => {
      orden.push('crea');
      return { competition: { id: 'c-nueva' }, successCount: 1, failedCourses: [] };
    });
  });

  it('C1: sin género, lo elige, se guarda y luego se crea', async () => {
    faltaGenero = true;
    await abreElFormulario();

    fireEvent.change(screen.getByTestId('selector-de-genero'), { target: { value: 'FEMALE' } });
    await rellenaYCrea();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockGuardarGenero).toHaveBeenCalledWith('FEMALE');
    expect(orden).toEqual(['genero', 'crea']);
  });

  it('C2: sin género y sin elegirlo, el navegador no lo envía: es obligatorio', async () => {
    faltaGenero = true;
    await abreElFormulario();

    await rellenaYCrea();

    expect(screen.getByTestId('selector-de-genero').validity.valueMissing).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCrear).not.toHaveBeenCalled();
    expect(mockGuardarGenero).not.toHaveBeenCalled();
  });

  it('C3: con género, ni se pregunta ni se toca el perfil', async () => {
    faltaGenero = false;
    await abreElFormulario();

    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
    await rellenaYCrea();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockGuardarGenero).not.toHaveBeenCalled();
  });

  it('C4: al editar no se pregunta: ya no se crea nada ni se inscribe a nadie', async () => {
    faltaGenero = true;
    mockDetalle.mockResolvedValue({
      id: 'c-1',
      name: 'Campeonato del club',
      startDate: '2027-06-01',
      endDate: '2027-06-03',
      status: 'ACTIVE',
      maxPlayers: 12,
      playMode: 'SCRATCH',
      countries: [{ code: 'ES' }],
      visibility: 'PRIVATE',
    });
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockDetalle).toHaveBeenCalled());
    await screen.findByTestId('visibilidad-PRIVATE');
    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
  });
});
