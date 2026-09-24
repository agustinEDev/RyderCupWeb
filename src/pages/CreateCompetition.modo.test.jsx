import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Elegir el modo de configuración al crear, y cambiarlo al editar (FE #695).
 *
 * Decidido el 22 sep: cuánto hace la aplicación por su cuenta se decide AL
 * PRINCIPIO, en un paso propio detrás del tipo. Y como el modo decide cómo se
 * reparten los equipos (RyderCupAm#351), esa pregunta desaparece del formulario.
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
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1', gender: 'MALE' }, loading: false }) }));
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

const pintaEdicion = () => render(
  <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
    <Routes>
      <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
    </Routes>
  </MemoryRouter>
);

const { createCompetitionWithGolfCoursesUseCase, updateCompetitionUseCase, getCompetitionDetailUseCase } =
  await import('../composition');

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

describe('CreateCompetition · elegir el modo de configuración (FE #695)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // La forma que devuelve de verdad el caso de uso: con solo `{ id }` la
    // pantalla revienta al leer `failedCourses.length` y el test daría por
    // buena una creación que falló
    createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue({
      competition: { id: 'c-nueva' },
      successCount: 0,
      failedCourses: [],
    });
    updateCompetitionUseCase.execute.mockResolvedValue({ id: 'c-1' });
    getCompetitionDetailUseCase.execute.mockResolvedValue({
      id: 'c-1',
      name: 'Ryder de los amigos',
      startDate: '2030-06-01',
      endDate: '2030-06-03',
      countries: [{ code: 'ES', isMain: true }],
      maxPlayers: 12,
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      setupMode: 'MANUAL',
      teamAssignment: 'MANUAL',
      creatorId: 'u-1',
    });
  });

  it('S1: tras elegir el tipo se pregunta el modo, y todavía no el formulario', async () => {
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));

    expect(await screen.findByTestId('modo-AUTOMATIC')).toBeInTheDocument();
    expect(screen.getByTestId('modo-MANUAL')).toBeInTheDocument();
    expect(screen.getByTestId('modo-RYDER_CUP')).toBeInTheDocument();
    expect(screen.queryByText('create.competitionDetails')).not.toBeInTheDocument();
  });

  it('S2: al elegirlo sale el formulario de siempre', async () => {
    pinta();

    await elegirTipoYModo('MANUAL');

    expect(await screen.findByText('create.competitionDetails')).toBeInTheDocument();
    // Sigue a la vista dentro del formulario, con el elegido marcado: el modo
    // decide el resto del camino, así que se puede cambiar sin volver atrás
    expect(screen.getByTestId('modo-MANUAL')).toHaveAttribute('aria-pressed', 'true');
  });

  it('S3: el modo elegido viaja al crear', async () => {
    pinta();
    await elegirTipoYModo('MANUAL');
    await screen.findByText('create.competitionDetails');
    rellenarMinimo();

    fireEvent.click(screen.getByRole('button', { name: 'create.createCompetition' }));

    await vi.waitFor(() =>
      expect(createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ setup_mode: 'MANUAL' }),
        expect.anything()
      )
    );
  });

  it('S4: el reparto de equipos ya no se pregunta: lo decide el modo', async () => {
    pinta();
    await elegirTipoYModo();
    await screen.findByText('create.competitionDetails');

    fireEvent.click(screen.getByText('create.moreOptions'));

    expect(screen.queryByText('create.teamAssignment')).not.toBeInTheDocument();
    // Y el modo se puede cambiar sin desplegar nada: decide el resto del camino
    expect(screen.getByTestId('modo-RYDER_CUP')).toHaveAttribute('aria-pressed', 'true');
  });

  it('S5: y tampoco se manda, para no contradecir al modo', async () => {
    pinta();
    await elegirTipoYModo('MANUAL');
    await screen.findByText('create.competitionDetails');
    rellenarMinimo();

    fireEvent.click(screen.getByRole('button', { name: 'create.createCompetition' }));

    await vi.waitFor(() => expect(createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
    const [payload] = createCompetitionWithGolfCoursesUseCase.execute.mock.calls[0];
    expect(payload).not.toHaveProperty('team_assignment');
  });

  it('S6: al editar no se pregunta de nuevo, pero se puede cambiar', async () => {
    pintaEdicion();

    // Esperando a que llegue la competición: el selector se pinta antes que ella
    await vi.waitFor(() =>
      expect(screen.getByTestId('modo-MANUAL')).toHaveAttribute('aria-pressed', 'true')
    );
    expect(screen.getByTestId('modo-RYDER_CUP')).toHaveAttribute('aria-pressed', 'false');
  });

  it('S7: al editar, el cambio viaja', async () => {
    pintaEdicion();
    await vi.waitFor(() =>
      expect(screen.getByTestId('modo-MANUAL')).toHaveAttribute('aria-pressed', 'true')
    );
    fireEvent.click(screen.getByTestId('modo-RYDER_CUP'));

    fireEvent.click(screen.getByRole('button', { name: 'edit.updateCompetition' }));

    await vi.waitFor(() =>
      expect(updateCompetitionUseCase.execute).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({ setup_mode: 'RYDER_CUP' })
      )
    );
  });

  it('S8: volver a elegir el tipo vuelve a preguntar el modo', async () => {
    // Cambiar de tipo puede cambiar lo que tiene sentido automatizar, así que
    // el modo se vuelve a preguntar. Lo escrito se queda, como con el tipo
    pinta();
    await elegirTipoYModo('MANUAL');
    await screen.findByText('create.competitionDetails');

    fireEvent.click(screen.getByTestId('volver-al-tipo'));
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));

    expect(await screen.findByTestId('modo-MANUAL')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('create.competitionDetails')).not.toBeInTheDocument();
  });

  it('S9: «Todo automático» se enseña pero todavía no se puede elegir', async () => {
    // La app aún no forma los equipos ni monta la agenda sola: la tarjeta
    // explica hacia dónde va, como Stableford y Medal en el tipo, y no miente
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));

    const automatico = await screen.findByTestId('modo-AUTOMATIC');
    expect(automatico).toHaveAttribute('aria-disabled', 'true');
    expect(automatico.textContent).toContain('create.type.comingSoon');

    fireEvent.click(automatico);

    expect(screen.queryByText('create.competitionDetails')).not.toBeInTheDocument();
  });
});
