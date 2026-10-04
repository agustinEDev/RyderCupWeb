import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router';

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
 *   E6  de editar A a editar B con A aún cargando     | la respuesta tardía de A no redirige ni avisa (CodeRabbit)
 *   E6b y si lo que tarda son los campos de A          | no pisan el formulario de B
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
const mockCampos = vi.fn().mockResolvedValue([]);
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: (...args) => mockActualizar(...args) },
  getCompetitionDetailUseCase: { execute: (...args) => mockDetalle(...args) },
  getCompetitionGolfCoursesUseCase: { execute: (...args) => mockCampos(...args) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
const mockValidar = vi.fn(() => null);
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));
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
    // E6 y E6b les ponen implementación propia: no puede pasar al siguiente
    mockDetalle.mockReset();
    mockCampos.mockReset();
    mockCampos.mockResolvedValue([]);
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

  it('E6: la carga tardía de otra competición no redirige ni avisa (CodeRabbit)', async () => {
    const { Link } = await import('react-router');
    let resolverA;
    mockDetalle.mockImplementation((id) =>
      id === 'c-1'
        ? new Promise((r) => {
            resolverA = r;
          })
        : Promise.resolve({ ...competicion('ACTIVE'), id: 'c-2', name: 'La de B' })
    );
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
          <Route path="/competitions/:id" element={<p>la ficha</p>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledWith('c-1'));

    fireEvent.click(screen.getByText('a la B'));
    expect(await screen.findByText('edit.updateCompetition')).toBeInTheDocument();
    resolverA(competicion('CLOSED'));
    await new Promise((r) => setTimeout(r, 50));

    expect(customToast.error).not.toHaveBeenCalled();
    expect(screen.queryByText('la ficha')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('La de B')).toBeInTheDocument();
  });

  it('E6b: si lo que llega tarde son los campos de A, no pisan el formulario de B', async () => {
    const { Link } = await import('react-router');
    let resolverCamposDeA;
    mockDetalle.mockImplementation((id) =>
      Promise.resolve({ ...competicion('ACTIVE'), id, name: id === 'c-1' ? 'La de A' : 'La de B' })
    );
    mockCampos.mockImplementation((id) =>
      id === 'c-1'
        ? new Promise((r) => {
            resolverCamposDeA = r;
          })
        : Promise.resolve([])
    );
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(mockCampos).toHaveBeenCalledWith('c-1'));

    fireEvent.click(screen.getByText('a la B'));
    expect(await screen.findByDisplayValue('La de B')).toBeInTheDocument();
    resolverCamposDeA([]);
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByDisplayValue('La de B')).toBeInTheDocument();
  });

  it('E7: si falla al guardar, el aviso se lleva a la vista y recibe el foco (FE #731)', async () => {
    // El botón está abajo y el aviso arriba: desde el botón solo se veía el toast
    const desplazar = vi.fn();
    const original = globalThis.Element.prototype.scrollIntoView;
    globalThis.Element.prototype.scrollIntoView = desplazar;
    mockDetalle.mockResolvedValueOnce(competicion('ACTIVE'));
    mockActualizar.mockRejectedValueOnce(
      Object.assign(new Error('Solo el creador puede actualizar'), { status: 403 })
    );
    pintaEdicion();

    fireEvent.click(await screen.findByText('edit.updateCompetition'));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Solo el creador puede actualizar');
    await waitFor(() => expect(desplazar).toHaveBeenCalled());
    expect(document.activeElement).toBe(aviso);
    // Con un anillo que se vea al recibir el foco, no sin contorno (CodeRabbit)
    expect(aviso.className).not.toMatch(/(^|\s)outline-none(\s|$)/);
    expect(aviso.className).toContain('focus:ring-2');
    globalThis.Element.prototype.scrollIntoView = original;
  });

  it('E8: si el mismo error de validación se repite, el foco vuelve al aviso (revisión local)', async () => {
    // Los dos cambios del mensaje —vaciarlo y ponerlo igual— se juntan en un
    // render, y un efecto que mirara solo el texto no se volvía a ejecutar
    const original = globalThis.Element.prototype.scrollIntoView;
    globalThis.Element.prototype.scrollIntoView = vi.fn();
    mockValidar.mockReturnValue({ key: 'nameRequired' });
    mockDetalle.mockResolvedValueOnce(competicion('ACTIVE'));
    pintaEdicion();
    // Cargada del todo: mientras carga, la página pasa un momento por la
    // pantalla de espera y el aviso se pintaría después
    await screen.findByDisplayValue('Campeonato del club');

    fireEvent.click(screen.getByText('edit.updateCompetition'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));

    const guardar = screen.getByText('edit.updateCompetition');
    guardar.focus();
    fireEvent.click(guardar);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));
    mockValidar.mockReturnValue(null);
    globalThis.Element.prototype.scrollIntoView = original;
  });
});

describe('CreateCompetition · el cupo no baja de los inscritos (FE #662)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` no quita implementaciones: una validación que falla de
    // un test anterior deja el botón de guardar deshabilitado
    mockValidar.mockReset();
    mockValidar.mockImplementation(() => null);
    mockDetalle.mockReset();
    mockCampos.mockReset();
    mockCampos.mockResolvedValue([]);
  });

  it('K1: con 14 dentro, el mínimo del campo es 14 y se dice por qué', async () => {
    mockDetalle.mockResolvedValueOnce({ ...competicion('ACTIVE'), maxPlayers: 24, enrolledCount: 14 });
    pintaEdicion();

    const campo = await screen.findByTestId('campo-jugadores');
    await waitFor(() => expect(campo).toHaveAttribute('min', '14'));
    expect(screen.getByTestId('cupo-minimo')).toHaveTextContent('create.capFloor 14');
  });

  it('K2: la validación sabe cuántos hay dentro', async () => {
    mockDetalle.mockResolvedValueOnce({ ...competicion('ACTIVE'), maxPlayers: 24, enrolledCount: 14 });
    pintaEdicion();
    // Con la competición ya cargada, como cuando la tiene delante quien edita
    await waitFor(() => expect(screen.getByTestId('campo-jugadores')).toHaveAttribute('min', '14'));
    fireEvent.click(screen.getByText('edit.updateCompetition'));

    // La del envío: la pantalla también valida en cada render, sin opciones
    await waitFor(() =>
      expect(mockValidar.mock.calls.some(([, opciones]) => opciones?.inscritos === 14)).toBe(true)
    );
  });

  it('K3: sin nadie dentro, el mínimo de siempre y sin aviso', async () => {
    mockDetalle.mockResolvedValueOnce({ ...competicion('ACTIVE'), enrolledCount: 0 });
    pintaEdicion();

    const campo = await screen.findByTestId('campo-jugadores');
    await screen.findByText('edit.updateCompetition');
    expect(campo).toHaveAttribute('min', '2');
    expect(screen.queryByTestId('cupo-minimo')).not.toBeInTheDocument();
  });

  it('K4: el error lleva el número para decirlo', async () => {
    mockDetalle.mockResolvedValueOnce({ ...competicion('ACTIVE'), maxPlayers: 24, enrolledCount: 14 });
    mockValidar.mockImplementation((_, opciones) =>
      opciones ? { key: 'capBelowEnrolled', count: 14 } : null
    );
    pintaEdicion();
    fireEvent.click(await screen.findByText('edit.updateCompetition'));

    expect(await screen.findByText('create.errors.capBelowEnrolled 14')).toBeInTheDocument();
    expect(mockActualizar).not.toHaveBeenCalled();
  });
});

describe('CreateCompetition · los inscritos son de SU competición (FE #662, revisión)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockReset();
    mockCampos.mockReset();
    mockCampos.mockResolvedValue([]);
    mockValidar.mockReset();
    mockValidar.mockImplementation(() => null);
  });

  it('K5: de editar una con 14 dentro a crear otra, el mínimo no se arrastra', async () => {
    // Crear y editar montan el mismo componente en el mismo sitio: no se
    // desmonta al ir de uno a otro
    const IrACrear = () => {
      const navegar = useNavigate();
      return <button onClick={() => navegar('/competitions/create')}>ir a crear</button>;
    };
    mockDetalle.mockResolvedValueOnce({ ...competicion('ACTIVE'), maxPlayers: 24, enrolledCount: 14 });
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <IrACrear />
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
          <Route path="/competitions/create" element={<CreateCompetition />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('campo-jugadores')).toHaveAttribute('min', '14'));

    fireEvent.click(screen.getByText('ir a crear'));
    // Al crear se elige antes el tipo y el modo (FE #799, #695)
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));

    await waitFor(() => expect(screen.getByTestId('campo-jugadores')).toHaveAttribute('min', '2'));
    expect(screen.queryByTestId('cupo-minimo')).not.toBeInTheDocument();
  });
});

