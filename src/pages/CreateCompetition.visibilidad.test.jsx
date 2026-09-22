import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * LA TABLA de la FE #664: elegir si el torneo es de los amigos o de cualquiera.
 *
 * El servidor ya decide por defecto (privada, RyderCupAM#318). Lo que falta es
 * que se pueda elegir, y que se vea lo que se está eligiendo: hoy la app no
 * manda el campo, así que todo lo que crea nace privado sin decirlo.
 *
 *   #   caso                                  | qué pasa
 *   ----|--------------------------------------|-------------------------
 *   1   se abre el formulario                  | privada viene puesta
 *   2   se deja como está y se crea            | se manda PRIVATE
 *   3   se elige pública y se crea             | se manda PUBLIC
 *   4   se elige pública y luego privada       | manda la última
 *   5   se lee lo que significa cada una       | hay una línea que lo explica
 */
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

// La forma que devuelve de verdad `CreateCompetitionWithGolfCoursesUseCase`:
// con solo `{ id }`, el componente revienta al leer `failedCourses.length` y el
// test acaba pasando por el `catch`, dando por buena una creación que falló
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

describe('CreateCompetition · de los amigos o de cualquiera (FE #664)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCrear.mockClear();
  });

  it('1: viene puesta privada, que es lo que hay hoy', async () => {
    await abreElFormulario();

    expect(await screen.findByTestId('visibilidad-PRIVATE')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('visibilidad-PUBLIC')).toHaveAttribute('aria-pressed', 'false');
  });

  it('2: sin tocar nada, se crea privada', async () => {
    await abreElFormulario();

    await rellenaYCrea();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockCrear.mock.calls[0][0]).toMatchObject({ visibility: 'PRIVATE' });
  });

  it('3: eligiendo pública, se crea pública', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
    await rellenaYCrea();

    // Crear una pública pasa por el modal que pregunta cuándo abren las
    // inscripciones (FE #666): lo que se crea sale de ahí, no del submit
    fireEvent.click(await screen.findByTestId('confirmar-apertura'));

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockCrear.mock.calls[0][0]).toMatchObject({ visibility: 'PUBLIC' });
  });

  it('4: y se puede cambiar de idea antes de crear', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));
    fireEvent.click(screen.getByTestId('visibilidad-PRIVATE'));
    await rellenaYCrea();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockCrear.mock.calls[0][0]).toMatchObject({ visibility: 'PRIVATE' });
  });

  it('5: dice lo que significa, porque «privada» solo no lo dice', async () => {
    await abreElFormulario();

    expect(await screen.findByTestId('visibilidad-explicacion')).toBeInTheDocument();
  });
});

describe('CreateCompetition · editar no cierra un torneo abierto (FE #664)', () => {
  const pintaEdicion = () => render(
    <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
      <Routes>
        <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
      </Routes>
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockActualizar.mockClear();
    mockDetalle.mockResolvedValue({
      id: 'c-1',
      name: 'Campeonato del club',
      startDate: '2027-06-01',
      endDate: '2027-06-03',
      status: 'DRAFT',
      maxPlayers: 12,
      playMode: 'SCRATCH',
      teamAssignment: 'AUTOMATIC',
      countries: [{ code: 'ES' }],
      visibility: 'PUBLIC',
    });
  });

  it('se carga como está: pública sigue pública', async () => {
    pintaEdicion();

    await waitFor(() =>
      expect(screen.getByTestId('visibilidad-PUBLIC')).toHaveAttribute('aria-pressed', 'true')
    );
  });

  it('y guardar sin tocarla no la cierra al público', async () => {
    // Era el peor caso: cambiar el nombre o las fechas de un torneo abierto lo
    // volvia privado sin avisar, y desaparecia de explorar
    pintaEdicion();
    await waitFor(() =>
      expect(screen.getByTestId('visibilidad-PUBLIC')).toHaveAttribute('aria-pressed', 'true')
    );

    fireEvent.click(screen.getByText('edit.updateCompetition'));

    await waitFor(() => expect(mockActualizar).toHaveBeenCalled());
    expect(mockActualizar.mock.calls[0][1]).toMatchObject({ visibility: 'PUBLIC' });
  });
});
