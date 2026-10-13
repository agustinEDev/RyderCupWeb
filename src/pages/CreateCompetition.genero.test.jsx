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
 *   C5  stroke play y «¿Juegas tú?» desmarcada| ni se pregunta ni se toca el perfil: no
 *       |                                      | juega (revisión de la FE-B, 13 oct);
 *       |                                      | marcada otra vez, vuelve
 *   C6  la desmarca y cambia a una Ryder      | se pregunta: en una Ryder siempre juega
 *   C7  guardar el género da un 409           | no es el nombre: arriba (`/code-review`)
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
const mockRefrescarSesion = vi.fn(async () => orden.push('sesion'));
vi.mock('../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: faltaGenero,
    guardar: mockGuardarGenero,
    refrescar: mockRefrescarSesion,
  }),
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
  it('C5: en un Medal, si no juega, ni se pregunta ni se guarda; si vuelve a jugar, sí', async () => {
    faltaGenero = true;
    mockCrear.mockClear();
    mockGuardarGenero.mockClear();
    render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId('tipo-MEDAL'));
    const juega = await screen.findByRole('checkbox', { name: 'create.organizerPlays' });
    expect(screen.getByTestId('selector-de-genero')).toBeInTheDocument();

    fireEvent.click(juega);
    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
    await rellenaYCrea();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockGuardarGenero).not.toHaveBeenCalled();
    expect(mockCrear.mock.calls[0][0].organizer_plays).toBe(false);

    fireEvent.click(juega);
    expect(screen.getByTestId('selector-de-genero')).toBeInTheDocument();
  });

  it('C7: si guardar el género da un 409, no se culpa al nombre', async () => {
    faltaGenero = true;
    mockCrear.mockClear();
    mockGuardarGenero.mockRejectedValueOnce(Object.assign(new Error('conflicto en el perfil'), { status: 409 }));
    await abreElFormulario();

    fireEvent.change(screen.getByTestId('selector-de-genero'), { target: { value: 'FEMALE' } });
    await rellenaYCrea();

    expect(await screen.findByText('conflicto en el perfil')).toBeInTheDocument();
    expect(screen.queryByTestId('error-del-nombre')).not.toBeInTheDocument();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('C6: la desmarca en un Medal y cambia a una Ryder: se pregunta, que ahí juega', async () => {
    faltaGenero = true;
    render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId('tipo-MEDAL'));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'create.organizerPlays' }));
    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('volver-al-tipo'));
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));

    expect(await screen.findByTestId('selector-de-genero')).toBeInTheDocument();
  });

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
    await waitFor(() => expect(orden).toEqual(['genero', 'crea', 'sesion']));
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
