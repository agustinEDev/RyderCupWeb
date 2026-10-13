import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El alta de una competición, lo que trae BE-B al front (RyderCupAm#540, #552).
 * Tabla aprobada el 13 oct 2026:
 *
 *   #     caso                                       | qué pasa
 *   ------|--------------------------------------------|----------------------------------
 *   20    crear un Stableford o un Medal             | «¿Juegas tú?», marcada, y se manda
 *         |                                            | `organizer_plays`; desmarcada, false
 *   20b   crear una Ryder                            | ni casilla ni `organizer_plays`
 *   20c   editar                                     | ni casilla ni `organizer_plays`
 *   21    el nombre no vale (vacío, corto, largo,    | el aviso junto al campo, en el idioma
 *         | sin letras)                                | de la app; no arriba
 *   21b   el servidor dice que ya tienes uno así (409)| junto al campo, traducido; ni el
 *         |                                            | texto del servidor ni el aviso de arriba
 *   21c   se corrige el nombre                       | el aviso se va
 *   21d   otro error del servidor                    | como antes: arriba y en un aviso
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) => (valores ? `${clave} ${JSON.stringify(valores)}` : clave),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
// El mismo `user` en cada render: uno nuevo relanza los efectos (intermitente)
const USUARIO = { user: { id: 'u-1', gender: 'MALE' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => USUARIO }));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
const mockToast = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../utils/toast', () => ({ default: mockToast }));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  updateStrokePlaySettingsUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: vi.fn() },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
  configureScheduleUseCase: { execute: vi.fn() },
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

// Lo que valida el formulario lo prueban sus tests: aquí, qué se envía
const mockValidar = vi.fn(() => null);
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));

const composicion = await import('../composition');
const CreateCompetition = (await import('./CreateCompetition')).default;

const alTipo = async (tipo) => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId(`tipo-${tipo}`));
};

const enviar = () => fireEvent.submit(document.querySelector('form'));

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
  countries: [{ code: 'ES' }],
  strokePlay: { categoryLimits: [12], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' },
};

const alEditar = async (competicion = MEDAL_GUARDADO) => {
  composicion.getCompetitionDetailUseCase.execute.mockResolvedValue(competicion);
  render(
    <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
      <Routes>
        <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
      </Routes>
    </MemoryRouter>
  );
  const jornadas = await screen.findByLabelText('create.strokePlay.matchdays');
  await vi.waitFor(() => expect(screen.getByTestId('campo-nombre')).toHaveValue(competicion.name));
  return jornadas;
};


describe('CreateCompetition · BE-B en el alta (FE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValidar.mockReturnValue(null);
    composicion.fetchCountriesUseCase.execute.mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]);
    composicion.getCompetitionGolfCoursesUseCase.execute.mockResolvedValue([]);
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue({
      competition: { id: 'nueva' },
      successCount: 0,
      failedCourses: [],
    });
    composicion.updateCompetitionUseCase.execute.mockResolvedValue({});
  });

  const enviado = async () => {
    await vi.waitFor(() => expect(composicion.createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
    return composicion.createCompetitionWithGolfCoursesUseCase.execute.mock.calls[0][0];
  };

  it.each(['STABLEFORD', 'MEDAL'])('20: un %s pregunta «¿Juegas tú?», marcada, y lo manda', async (tipo) => {
    await alTipo(tipo);

    const casilla = await screen.findByRole('checkbox', { name: 'create.organizerPlays' });
    expect(casilla).toBeChecked();
    enviar();

    expect((await enviado()).organizer_plays).toBe(true);
  });

  it('20: desmarcada, se manda que no juega', async () => {
    await alTipo('MEDAL');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'create.organizerPlays' }));

    enviar();

    expect((await enviado()).organizer_plays).toBe(false);
  });

  it('20b: una Ryder ni la pregunta ni la manda', async () => {
    await alTipo('RYDER_CUP');
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    await screen.findByTestId('campo-nombre');

    expect(screen.queryByRole('checkbox', { name: 'create.organizerPlays' })).toBeNull();
    enviar();

    expect(await enviado()).not.toHaveProperty('organizer_plays');
  });

  it('20c: al editar ni se pregunta ni se manda', async () => {
    await alEditar();

    expect(screen.queryByRole('checkbox', { name: 'create.organizerPlays' })).toBeNull();
    enviar();

    await vi.waitFor(() => expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalled());
    expect(composicion.updateCompetitionUseCase.execute.mock.calls[0][1]).not.toHaveProperty('organizer_plays');
  });

  it.each(['nameRequired', 'nameTooShort', 'nameTooLong', 'nameUnreadable'])(
    '21: %s, junto al campo y no arriba',
    async (clave) => {
      mockValidar.mockReturnValue({ key: clave });
      await alTipo('MEDAL');
      const campo = await screen.findByTestId('campo-nombre');

      enviar();

      const aviso = await screen.findByTestId('error-del-nombre');
      expect(aviso).toHaveTextContent(`create.errors.${clave}`);
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      expect(campo).toHaveAttribute('aria-describedby', aviso.id);
      // Una vez: junto al campo, no repetido en el aviso de arriba
      expect(screen.getAllByText(`create.errors.${clave}`)).toHaveLength(1);
      expect(composicion.createCompetitionWithGolfCoursesUseCase.execute).not.toHaveBeenCalled();
    }
  );

  it('21b: un 409 (ya tienes una con ese nombre), traducido junto al campo', async () => {
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Ya existe una competición con el nombre «Medal»'), { status: 409 })
    );
    await alTipo('MEDAL');
    const campo = await screen.findByTestId('campo-nombre');

    enviar();

    expect(await screen.findByTestId('error-del-nombre')).toHaveTextContent('create.errors.nameTaken');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(mockToast.error).not.toHaveBeenCalledWith('Ya existe una competición con el nombre «Medal»');
    expect(screen.queryByText('Ya existe una competición con el nombre «Medal»')).toBeNull();
  });

  it('21c: al cambiar el nombre, el aviso se va', async () => {
    // No `Once`: el resumen de «Más opciones» también valida al pintar
    mockValidar.mockReturnValue({ key: 'nameTooShort' });
    await alTipo('MEDAL');
    const campo = await screen.findByTestId('campo-nombre');
    enviar();
    await screen.findByTestId('error-del-nombre');
    mockValidar.mockReturnValue(null);

    fireEvent.change(campo, { target: { value: 'Medal de otoño' } });

    expect(screen.queryByTestId('error-del-nombre')).toBeNull();
    expect(campo).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('21d: otro error del servidor, como antes: arriba y en un aviso', async () => {
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockRejectedValue(
      Object.assign(new Error('País no válido'), { status: 400 })
    );
    await alTipo('MEDAL');

    enviar();

    await vi.waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('País no válido'));
    expect(screen.queryByTestId('error-del-nombre')).toBeNull();
  });
});
