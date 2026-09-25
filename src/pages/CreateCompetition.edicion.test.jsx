import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * LA TABLA de la edición (FE #710).
 *
 *   #   caso                                          | qué pasa
 *   ----|---------------------------------------------|---------------------------------
 *   E1  se entra por URL a una cerrada                | se dice por qué y se vuelve a la ficha
 *   E2  una en curso, igual                           | igual
 *   E3  abierta                                       | se edita, como siempre
 *   E4  las fechas dejan sesiones fuera               | se dice cuáles, en el idioma de quien mira
 *   E5  otro error                                    | el mensaje del servidor, como siempre
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores && typeof valores === 'object' ? `${clave} ${Object.values(valores).join(' ')}` : clave,
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
const mockActualizar = vi.fn();
const mockDetalle = vi.fn();
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: (...args) => mockActualizar(...args) },
  getCompetitionDetailUseCase: { execute: (...args) => mockDetalle(...args) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
vi.mock('../utils/competitionFormValidation', () => ({ validateCompetitionForm: () => null }));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

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
    </MemoryRouter>
  );

describe('CreateCompetition · editar (FE #710)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(['CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])(
    'E1/E2: %s no se edita: se dice por qué y se vuelve a la ficha',
    async (status) => {
      mockDetalle.mockResolvedValueOnce(competicion(status));
      pintaEdicion();

      expect(await screen.findByText('la ficha')).toBeInTheDocument();
      expect(customToast.error).toHaveBeenCalledWith('edit.notEditable');
      expect(screen.queryByText('edit.updateCompetition')).not.toBeInTheDocument();
    }
  );

  it.each(['DRAFT', 'ACTIVE'])('E3: %s se edita, como siempre', async (status) => {
    mockDetalle.mockResolvedValueOnce(competicion(status));
    pintaEdicion();

    expect(await screen.findByText('edit.updateCompetition')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('E4: si las fechas dejan sesiones fuera, dice cuáles, en su idioma', async () => {
    mockDetalle.mockResolvedValueOnce(competicion('ACTIVE'));
    mockActualizar.mockRejectedValueOnce(
      Object.assign(new Error('Las fechas dejan fuera 2 sesiones'), {
        status: 400,
        errorCode: 'DATES_LEAVE_SESSIONS_OUT',
        data: {
          sessions_outside: [
            { id: 'r1', round_date: '2026-10-05', session_type: 'MORNING' },
            { id: 'r2', round_date: '2026-10-05', session_type: 'AFTERNOON' },
          ],
        },
      })
    );
    pintaEdicion();

    fireEvent.click(await screen.findByText('edit.updateCompetition'));

    const esperado =
      'edit.datesLeaveSessionsOut lun, 5 oct · schedule:sessions.MORNING, lun, 5 oct · schedule:sessions.AFTERNOON';
    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith(esperado));
    expect(screen.getByText(esperado)).toBeInTheDocument();
  });

  it('E5: otro error: el mensaje del servidor, como siempre', async () => {
    mockDetalle.mockResolvedValueOnce(competicion('ACTIVE'));
    mockActualizar.mockRejectedValueOnce(
      // Aunque traiga una lista con ese nombre: lo que manda es el código
      Object.assign(new Error('Solo el creador puede actualizar'), {
        status: 403,
        errorCode: 'NOT_CREATOR',
        data: { sessions_outside: [{ id: 'r1', round_date: '2026-10-05', session_type: 'MORNING' }] },
      })
    );
    pintaEdicion();

    fireEvent.click(await screen.findByText('edit.updateCompetition'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('Solo el creador puede actualizar')
    );
  });
});
