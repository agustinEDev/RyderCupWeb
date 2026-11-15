import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Mover una competición que cerró el plazo de inscripción (15 nov 2026;
 * RyderCupAm #865): mientras está CLOSED y la cerró el plazo (no el
 * organizador), solo se cambian las fechas; el servidor acepta el formulario
 * entero si lo demás no cambia, y la reabre si el plazo nuevo queda por delante.
 *
 *   caso                                              | qué pasa
 *   --------------------------------------------------|----------------------------------------------
 *   M1 cerrada por el plazo                            | se edita, con el aviso de que solo van las fechas
 *   M2 lo demás                                        | desactivado (nombre, visibilidad…)
 *   M3 las fechas                                      | se cambian y se guardan, con lo demás como estaba
 *   M4 cerrada a mano                                  | no se edita, como siempre
 *   M4b ya empezada (aunque la cerrara el plazo)       | no se edita
 *   M7 acortar por debajo de las jornadas (stroke play) | no se manda: el aviso, traducido, junto a las fechas
 *   M8 lo demás del formulario no se valida            | se manda (lo demás no se puede tocar)
 *   M8b el fin antes del comienzo                      | no se manda: el aviso junto a las fechas
 *   M8c sin una de las fechas                          | no se manda: el aviso junto a las fechas
 *   M8d el aviso de las fechas, en un móvil          | se trae a la vista y se le da el foco, también al repetirlo
 *   M9 el servidor lo rechaza con un código conocido  | su texto traducido, junto a las fechas
 *   M9b el servidor lo rechaza sin código conocido    | el genérico, no su texto en bruto
 *   M6 mover con la sala de draft abierta (409)      | «No se pueden mover las fechas con la sala de draft abierta…», no «nombre ya usado»
 *   M5 abierta                                         | todo se edita, sin el aviso
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

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-1', gender: 'MALE' }, loading: false }),
}));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: () => null,
}));
vi.mock('../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));
const mockActualizar = vi.fn();
const mockDetalle = vi.fn();
const mockCampos = vi.fn().mockResolvedValue([]);
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: (...args) => mockActualizar(...args) },
  getCompetitionDetailUseCase: { execute: (...args) => mockDetalle(...args) },
  getCompetitionGolfCoursesUseCase: {
    execute: (...args) => mockCampos(...args),
  },
  fetchCountriesUseCase: {
    execute: vi
      .fn()
      .mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]),
  },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
const mockValidar = vi.fn(() => null);
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: () => null,
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({
  default: () => null,
}));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../components/ui/CountryFlag', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;
const customToast = (await import('../utils/toast')).default;

const competicion = (status) => ({
  id: 'c-1',
  name: 'Campeonato del club',
  startDate: '2026-10-03',
  endDate: '2026-10-05',
  status,
  maxPlayers: 12,
  playMode: 'SCRATCH',
  teamAssignment: 'AUTOMATIC',
  countries: [{ code: 'ES' }],
  visibility: 'PRIVATE',
});

const pintaEdicion = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
      <Routes>
        <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
        <Route path="/competitions/:id" element={<p>la ficha</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('CreateCompetition · cerrada por el plazo: solo las fechas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidar.mockImplementation(() => null);
    mockDetalle.mockReset();
    mockCampos.mockReset();
    mockCampos.mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const porElPlazo = (cambios = {}) => ({
    ...competicion('CLOSED'),
    enrollmentClosedByDeadline: true,
    ...cambios,
  });

  it('M1: Given cerrada por el plazo, When se abre, Then se edita con el aviso', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    pintaEdicion();

    expect(
      await screen.findByText('edit.updateCompetition'),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('solo-las-fechas')).toHaveTextContent(
      'edit.onlyDates',
    );
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('M2: Given cerrada por el plazo, When se pinta, Then lo demás está desactivado', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    pintaEdicion();
    // Con lo de la competición ya puesto en el formulario
    await screen.findByDisplayValue('Campeonato del club');

    expect(screen.getByDisplayValue('Campeonato del club')).toBeDisabled();
    expect(screen.getByLabelText('create.startDate')).toBeEnabled();
    expect(screen.getByLabelText('create.endDate')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    ).toBeEnabled();
  });

  it('M3: Given cerrada por el plazo, When cambia las fechas y guarda, Then van las nuevas con lo demás igual', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    mockActualizar.mockResolvedValueOnce({});
    pintaEdicion();
    // Con lo de la competición ya puesto en el formulario
    await screen.findByDisplayValue('Campeonato del club');

    fireEvent.change(screen.getByLabelText('create.startDate'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('create.endDate'), {
      target: { value: '2026-10-12' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    );

    await waitFor(() => expect(mockActualizar).toHaveBeenCalled());
    const [id, payload] = mockActualizar.mock.calls[0];
    expect(id).toBe('c-1');
    expect(payload).toMatchObject({
      name: 'Campeonato del club',
      start_date: '2026-10-10',
      end_date: '2026-10-12',
    });
  });

  it('M7: Given un Medal de 3 jornadas cerrado por el plazo, When lo deja en un día, Then no se manda y el aviso sale junto a las fechas', async () => {
    mockDetalle.mockResolvedValueOnce(
      porElPlazo({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: {
          categoryCount: 2,
          categoryLimits: [],
          maxMatchdaysPerPlayer: 3,
          overallStanding: 'ACCUMULATED',
        },
      }),
    );
    pintaEdicion();
    await screen.findByDisplayValue('Campeonato del club');

    fireEvent.change(screen.getByLabelText('create.endDate'), {
      target: { value: '2026-10-03' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    );

    expect(await screen.findByTestId('error-de-las-fechas')).toHaveTextContent(
      'create.errors.matchdaysMoreThanDays 1',
    );
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it('M8: Given el resto del formulario no pasaría, When guarda las fechas, Then se manda igual', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    mockActualizar.mockResolvedValueOnce({});
    mockValidar.mockImplementation((_f, opciones) =>
      opciones ? { key: 'countryRequired' } : null,
    );
    pintaEdicion();
    await screen.findByDisplayValue('Campeonato del club');

    fireEvent.click(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    );

    await waitFor(() => expect(mockActualizar).toHaveBeenCalled());
  });

  it.each([
    ['M8b', { endDate: '2026-10-01' }, 'create.errors.endDateAfterStart'],
    ['M8c', { startDate: '' }, 'create.errors.datesRequired'],
  ])(
    '%s: Given unas fechas que no valen, When guarda, Then no se manda y se dice junto a ellas',
    async (_, fechas, texto) => {
      mockDetalle.mockResolvedValueOnce(porElPlazo());
      pintaEdicion();
      await screen.findByDisplayValue('Campeonato del club');

      if (fechas.endDate !== undefined)
        fireEvent.change(screen.getByLabelText('create.endDate'), {
          target: { value: fechas.endDate },
        });
      if (fechas.startDate !== undefined)
        fireEvent.change(screen.getByLabelText('create.startDate'), {
          target: { value: fechas.startDate },
        });
      fireEvent.click(
        screen.getByRole('button', { name: 'edit.updateCompetition' }),
      );

      expect(
        await screen.findByTestId('error-de-las-fechas'),
      ).toHaveTextContent(texto);
      expect(mockActualizar).not.toHaveBeenCalled();
    },
  );

  it('M8d: Given unas fechas que no valen, When guarda (dos veces), Then el aviso se trae a la vista y tiene el foco', async () => {
    const traer = vi.spyOn(globalThis.Element.prototype, 'scrollIntoView');
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    pintaEdicion();
    await screen.findByDisplayValue('Campeonato del club');
    fireEvent.change(screen.getByLabelText('create.endDate'), {
      target: { value: '2026-10-01' },
    });
    const guardar = screen.getByRole('button', {
      name: 'edit.updateCompetition',
    });

    fireEvent.click(guardar);

    const aviso = await screen.findByTestId('error-de-las-fechas');
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(traer.mock.instances).toContain(aviso);

    // El mismo aviso otra vez: se vuelve a traer
    traer.mockClear();
    guardar.focus();
    fireEvent.click(guardar);
    await waitFor(() =>
      expect(screen.getByTestId('error-de-las-fechas')).toHaveFocus(),
    );
    expect(traer).toHaveBeenCalled();
    traer.mockRestore();
  });

  it.each([
    [
      'M9',
      Object.assign(new Error('raw'), {
        status: 400,
        errorCode: 'DATES_LEAVE_SESSIONS_OUT',
        data: {
          sessions_outside: [
            { round_date: '2026-10-05', session_type: 'MORNING' },
          ],
        },
      }),
      'edit.datesLeaveSessionsOut',
    ],
    [
      'M9b',
      Object.assign(new Error('Texto en bruto del servidor'), { status: 400 }),
      'edit.error',
    ],
  ])(
    '%s: Given el servidor lo rechaza, When guarda, Then su texto traducido junto a las fechas',
    async (_, error, texto) => {
      mockDetalle.mockResolvedValueOnce(porElPlazo());
      mockActualizar.mockRejectedValueOnce(error);
      pintaEdicion();
      await screen.findByDisplayValue('Campeonato del club');

      fireEvent.click(
        screen.getByRole('button', { name: 'edit.updateCompetition' }),
      );

      const aviso = await screen.findByTestId('error-de-las-fechas');
      expect(aviso).toHaveTextContent(texto);
      expect(aviso).not.toHaveTextContent('en bruto');
    },
  );

  it('M6: Given la sala de draft abierta, When guarda las fechas, Then se dice que termine antes el draft', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo());
    mockActualizar.mockRejectedValueOnce(
      Object.assign(new Error('Draft in progress'), {
        status: 409,
        errorCode: 'DRAFT_IN_PROGRESS',
      }),
    );
    pintaEdicion();
    await screen.findByDisplayValue('Campeonato del club');

    fireEvent.click(
      screen.getByRole('button', { name: 'edit.updateCompetition' }),
    );

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('edit.datesDuringDraft'),
    );
  });

  it('M4: Given cerrada a mano, When se abre, Then no se edita', async () => {
    mockDetalle.mockResolvedValueOnce(
      porElPlazo({ enrollmentClosedByDeadline: false }),
    );
    pintaEdicion();

    expect(await screen.findByText('la ficha')).toBeInTheDocument();
    expect(customToast.error).toHaveBeenCalledWith('edit.notEditable');
  });

  it('M4b: Given ya empezada aunque la cerrara el plazo, When se abre, Then no se edita', async () => {
    mockDetalle.mockResolvedValueOnce(porElPlazo({ status: 'IN_PROGRESS' }));
    pintaEdicion();

    expect(await screen.findByText('la ficha')).toBeInTheDocument();
    expect(customToast.error).toHaveBeenCalledWith('edit.notEditable');
  });

  it('M5: Given abierta, When se abre, Then todo se edita sin el aviso', async () => {
    mockDetalle.mockResolvedValueOnce(competicion('ACTIVE'));
    pintaEdicion();
    // Con lo de la competición ya puesto en el formulario
    await screen.findByDisplayValue('Campeonato del club');

    expect(screen.queryByTestId('solo-las-fechas')).toBeNull();
    expect(screen.getByDisplayValue('Campeonato del club')).toBeEnabled();
  });
});
