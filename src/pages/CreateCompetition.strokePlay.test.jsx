import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Crear y editar un Stableford o un Medal con sus ajustes (FE #824). Casos de
 * la tabla de la PR 2 (10 oct 2026):
 *
 *   #    caso                                      | qué pasa
 *   -----|-------------------------------------------|-------------------------------
 *   1-2  se elige Stableford                        | formulario con la sección de ajustes
 *   3    Ryder                                      | sin sección ni `stroke_play`
 *   14   crear                                      | un POST con `stroke_play`, un solo modo
 *   15   editar sin tocar los ajustes               | sin PATCH
 *   16   editar tocando ajustes                     | PATCH solo con lo que cambió
 *   17   más jornadas que solo caben con las fechas nuevas | primero lo general
 *   18   falla la segunda petición                  | se dice qué se guardó; no se sale
 *   19   el servidor rechaza los ajustes            | su motivo
 *   20   editar con categorías iguales              | ese modo, con su número
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

describe('CreateCompetition · Stableford y Medal con sus ajustes (FE #824)', () => {
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
    composicion.updateStrokePlaySettingsUseCase.execute.mockResolvedValue({
      categoryLimits: [12],
      categoryCount: null,
      maxMatchdaysPerPlayer: 2,
      overallStanding: 'ACCUMULATED',
    });
  });

  it('1-2: elegir Stableford lleva al formulario con su sección de ajustes', async () => {
    await alTipo('STABLEFORD');

    expect(await screen.findByTestId('campo-nombre')).toBeInTheDocument();
    expect(screen.getByTestId('ajustes-stroke-play')).toBeInTheDocument();
    expect(screen.queryByTestId('modo-RYDER_CUP')).toBeNull();
  });

  it('3: una Ryder no tiene sección de stroke play', async () => {
    await alTipo('RYDER_CUP');
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));

    await screen.findByTestId('campo-nombre');
    expect(screen.queryByTestId('ajustes-stroke-play')).toBeNull();
  });

  it('3b: y no manda `stroke_play` al crearla', async () => {
    await alTipo('RYDER_CUP');
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    await screen.findByTestId('campo-nombre');

    enviar();

    await vi.waitFor(() => expect(composicion.createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
    expect(composicion.createCompetitionWithGolfCoursesUseCase.execute.mock.calls[0][0]).not.toHaveProperty('stroke_play');
  });

  it('14: crear un Medal con un límite manda los límites, las jornadas y la general', async () => {
    await alTipo('MEDAL');
    fireEvent.click(await screen.findByRole('button', { name: 'create.strokePlay.addLimit' }));
    fireEvent.change(screen.getByLabelText(/create.strokePlay.limitLabel/), { target: { value: '12,0' } });

    enviar();

    await vi.waitFor(() => expect(composicion.createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
    const [payload] = composicion.createCompetitionWithGolfCoursesUseCase.execute.mock.calls[0];
    expect(payload.tournament_type).toBe('MEDAL');
    expect(payload.stroke_play).toEqual({
      category_limits: [12],
      max_matchdays_per_player: 1,
      overall_standing: 'ACCUMULATED',
    });
  });

  it('14b: con categorías iguales manda el número y no los límites', async () => {
    await alTipo('STABLEFORD');
    fireEvent.click(await screen.findByRole('button', { name: 'create.strokePlay.addLimit' }));
    fireEvent.change(screen.getByLabelText(/create.strokePlay.limitLabel/), { target: { value: '12,0' } });
    fireEvent.click(screen.getByTestId('modo-IGUALES'));

    enviar();

    await vi.waitFor(() => expect(composicion.createCompetitionWithGolfCoursesUseCase.execute).toHaveBeenCalled());
    expect(composicion.createCompetitionWithGolfCoursesUseCase.execute.mock.calls[0][0].stroke_play).toEqual({
      category_count: 3,
      max_matchdays_per_player: 1,
      overall_standing: 'ACCUMULATED',
    });
  });

  it('15: editar sin tocar los ajustes no los manda', async () => {
    await alEditar();

    enviar();

    await vi.waitFor(() => expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalled());
    expect(composicion.updateStrokePlaySettingsUseCase.execute).not.toHaveBeenCalled();
    expect(composicion.updateCompetitionUseCase.execute.mock.calls[0][1]).not.toHaveProperty('stroke_play');
  });

  it('16: tocar las jornadas manda solo las jornadas, y antes que lo general', async () => {
    const jornadas = await alEditar();
    fireEvent.change(jornadas, { target: { value: '2' } });

    enviar();

    await vi.waitFor(() => expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalled());
    expect(composicion.updateStrokePlaySettingsUseCase.execute).toHaveBeenCalledWith('c-1', { maxMatchdaysPerPlayer: 2 });
    expect(composicion.updateStrokePlaySettingsUseCase.execute.mock.invocationCallOrder[0]).toBeLessThan(
      composicion.updateCompetitionUseCase.execute.mock.invocationCallOrder[0]
    );
    expect(mockToast.success).toHaveBeenCalledWith('edit.success');
  });

  it('17: más jornadas de las que caben en las fechas guardadas: primero las fechas', async () => {
    const jornadas = await alEditar();
    fireEvent.change(screen.getByLabelText(/endDate/), { target: { value: '2030-10-13' } });
    fireEvent.change(jornadas, { target: { value: '4' } });

    enviar();

    await vi.waitFor(() => expect(composicion.updateStrokePlaySettingsUseCase.execute).toHaveBeenCalled());
    expect(composicion.updateCompetitionUseCase.execute.mock.invocationCallOrder[0]).toBeLessThan(
      composicion.updateStrokePlaySettingsUseCase.execute.mock.invocationCallOrder[0]
    );
  });

  it('18: si fallan los ajustes tras guardar lo general, lo dice y no se va', async () => {
    composicion.updateStrokePlaySettingsUseCase.execute.mockRejectedValue(new Error('motivo del servidor'));
    const jornadas = await alEditar();
    fireEvent.change(screen.getByLabelText(/endDate/), { target: { value: '2030-10-13' } });
    fireEvent.change(jornadas, { target: { value: '4' } });

    enviar();

    expect(await screen.findByText('edit.strokePlayNotSaved {"motivo":"motivo del servidor"}')).toBeInTheDocument();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText('create.strokePlay.matchdays')).toHaveValue(4);
  });

  it('18b: si falla lo general tras guardar los ajustes, también lo dice', async () => {
    composicion.updateCompetitionUseCase.execute.mockRejectedValue(new Error('nombre repetido'));
    const jornadas = await alEditar();
    fireEvent.change(jornadas, { target: { value: '2' } });

    enviar();

    expect(await screen.findByText('edit.generalNotSaved {"motivo":"nombre repetido"}')).toBeInTheDocument();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('18c: y al reintentar no vuelve a mandar los ajustes que ya se guardaron', async () => {
    composicion.updateCompetitionUseCase.execute.mockRejectedValueOnce(new Error('nombre repetido'));
    const jornadas = await alEditar();
    fireEvent.change(jornadas, { target: { value: '2' } });
    enviar();
    await screen.findByText('edit.generalNotSaved {"motivo":"nombre repetido"}');

    enviar();

    await vi.waitFor(() => expect(composicion.updateCompetitionUseCase.execute).toHaveBeenCalledTimes(2));
    expect(composicion.updateStrokePlaySettingsUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('19: si el servidor rechaza los ajustes (que van primero), se ve su motivo', async () => {
    composicion.updateStrokePlaySettingsUseCase.execute.mockRejectedValue(
      new Error('Hay jugadores que ya juegan 2 jornadas')
    );
    const jornadas = await alEditar({ ...MEDAL_GUARDADO, strokePlay: { ...MEDAL_GUARDADO.strokePlay, maxMatchdaysPerPlayer: 2 } });
    fireEvent.change(jornadas, { target: { value: '1' } });

    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Hay jugadores que ya juegan 2 jornadas');
    expect(composicion.updateCompetitionUseCase.execute).not.toHaveBeenCalled();
  });

  it('20: una con categorías iguales se edita en ese modo y con su número', async () => {
    await alEditar({
      ...MEDAL_GUARDADO,
      strokePlay: { categoryLimits: [], categoryCount: 4, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' },
    });

    expect(screen.getByTestId('modo-IGUALES')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('create.strokePlay.equalCount')).toHaveValue('4');
  });
});
