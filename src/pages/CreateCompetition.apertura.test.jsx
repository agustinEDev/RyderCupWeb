import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * LA TABLA de la FE #666: cuándo se abren las inscripciones.
 *
 * El backend ya lo soporta entero (RyderCupAM#332): sin días la competición
 * nace con las inscripciones abiertas, y con ellos espera hasta su día. Lo que
 * falta es que se pueda decir, y decirlo donde se vea: en «Más opciones» lo
 * vería quien abre el bloque, o sea casi nadie.
 *
 *   #   caso                                      | qué pasa
 *   ----|------------------------------------------|------------------------
 *   1   privada + crear                            | se crea, sin modal
 *   2   pública + crear                            | sale el modal
 *   3   modal recién abierto                       | «abrir ahora» preseleccionado
 *   4   «abrir ahora» + crear                      | no se manda el campo
 *   5   «X días antes» + crear                     | se manda el entero
 *   6   cerrar el modal                            | NO se crea nada
 *   7   más días que los que faltan                | avisa de que abrirá ya
 *   8   días elegidos                             | enseña la fecha de apertura
 *   9   los días JUSTOS que faltan                | no avisa: la apertura es hoy
 *  10   volver y entrar otra vez                  | no conserva lo elegido antes
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
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
const mockToastError = vi.fn();
vi.mock('../utils/toast', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
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

/**
 * Una fecha a N días de hoy, en formato YYYY-MM-DD y por calendario LOCAL.
 *
 * Sumando milisegundos y pasando por `toISOString()` se cuenta en UTC: en un
 * huso positivo, «dentro de 7 días» puede salir a 6 días de calendario local, y
 * entonces elegir 7 días de antelación dispara el aviso y el test falla según
 * dónde se ejecute.
 */
const enDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/** Entra al formulario: el tipo se elige antes (FE #639). */
const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  // Y el modo de configuración, que es el paso siguiente (FE #695). Estilo
  // RyderCup es lo que estas pantallas daban por hecho
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
};

/** Rellena lo imprescindible. No envía. */
const rellena = () => {
  fireEvent.change(screen.getByLabelText(/create\.competitionName/), {
    target: { name: 'name', value: 'Torneo del club' },
  });
  fireEvent.change(screen.getByLabelText(/create\.startDate/), {
    target: { name: 'startDate', value: '2027-06-01' },
  });
  fireEvent.change(screen.getByLabelText(/create\.endDate/), {
    target: { name: 'endDate', value: '2027-06-03' },
  });
};

const pulsaCrear = () => fireEvent.click(screen.getByText('create.createCompetition'));
const haceLaPublica = () => fireEvent.click(screen.getByTestId('visibilidad-PUBLIC'));

describe('CreateCompetition · cuándo se abren las inscripciones (FE #666)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCrear.mockClear();
    mockToastError.mockClear();
  });

  it('1: una privada se crea sin preguntar nada', async () => {
    await abreElFormulario();
    rellena();

    pulsaCrear();

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(screen.queryByTestId('modal-apertura')).not.toBeInTheDocument();
  });

  it('2: una pública pregunta antes de crearse', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();

    pulsaCrear();

    expect(await screen.findByTestId('modal-apertura')).toBeInTheDocument();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('3: viene preseleccionado abrirlas ya, que es lo que pasa si no tocas nada', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();
    pulsaCrear();

    await screen.findByTestId('modal-apertura');

    expect(screen.getByTestId('apertura-AHORA')).toBeChecked();
    expect(screen.getByTestId('apertura-PROGRAMADA')).not.toBeChecked();
  });

  it('4: abrirlas ya no manda el campo', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('confirmar-apertura'));

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    const [payload] = mockCrear.mock.calls[0];
    expect(payload.enrollment_opens_days_before ?? null).toBeNull();
    // Y por el camino bueno: si el mock no cumpliera el contrato del caso de
    // uso, el componente reventaría al leer la respuesta y acabaría en el
    // `catch` con el assert de arriba en verde igualmente
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('5: programarla manda los días elegidos', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.change(screen.getByTestId('apertura-dias'), { target: { value: '7' } });
    fireEvent.click(screen.getByTestId('confirmar-apertura'));

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    const [payload] = mockCrear.mock.calls[0];
    expect(payload.enrollment_opens_days_before).toBe(7);
  });

  it('6: cerrar el modal no crea nada, vuelve al formulario', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('volver-al-formulario'));

    await waitFor(() =>
      expect(screen.queryByTestId('modal-apertura')).not.toBeInTheDocument()
    );
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('7: pidiendo más días de los que faltan, avisa de que abrirá inmediatamente', async () => {
    await abreElFormulario();
    fireEvent.change(screen.getByLabelText(/create\.competitionName/), {
      target: { name: 'name', value: 'Torneo inminente' },
    });
    // El torneo empieza pasado mañana: 14 días antes ya pasó
    const pasadoManana = enDias(2);
    fireEvent.change(screen.getByLabelText(/create\.startDate/), {
      target: { name: 'startDate', value: pasadoManana },
    });
    fireEvent.change(screen.getByLabelText(/create\.endDate/), {
      target: { name: 'endDate', value: pasadoManana },
    });
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.change(screen.getByTestId('apertura-dias'), { target: { value: '14' } });

    expect(await screen.findByTestId('aviso-abre-ya')).toBeInTheDocument();
  });

  it('9: pidiendo los días JUSTOS que faltan, no avisa: dice que abre hoy', async () => {
    await abreElFormulario();
    fireEvent.change(screen.getByLabelText(/create\.competitionName/), {
      target: { name: 'name', value: 'Torneo en una semana' },
    });
    const enUnaSemana = enDias(7);
    fireEvent.change(screen.getByLabelText(/create\.startDate/), {
      target: { name: 'startDate', value: enUnaSemana },
    });
    fireEvent.change(screen.getByLabelText(/create\.endDate/), {
      target: { name: 'endDate', value: enUnaSemana },
    });
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.change(screen.getByTestId('apertura-dias'), { target: { value: '7' } });

    // Siete días antes de un torneo que empieza dentro de siete es HOY: la
    // apertura no ha pasado, así que decir que abrirá «al crearla» sería un
    // aviso de más justo en el borde. Pero tampoco la fecha: «el 21 de
    // septiembre» el propio 21 obliga a mirar el calendario (FE #678)
    expect(screen.queryByTestId('aviso-abre-ya')).not.toBeInTheDocument();
    expect(await screen.findByTestId('fecha-de-apertura')).toHaveTextContent('apertura.abreHoy');
  });

  it('10: volver y entrar otra vez NO conserva lo elegido antes', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();

    // Primera vez: se programa a 7 días y se vuelve al formulario
    pulsaCrear();
    await screen.findByTestId('modal-apertura');
    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.change(screen.getByTestId('apertura-dias'), { target: { value: '7' } });
    fireEvent.click(screen.getByTestId('volver-al-formulario'));
    await waitFor(() =>
      expect(screen.queryByTestId('modal-apertura')).not.toBeInTheDocument()
    );

    // Segunda vez: tiene que volver a empezar en «abrir ahora», o confirmar
    // mandaría los 7 días de la vez anterior sin que nadie los haya elegido
    pulsaCrear();
    await screen.findByTestId('modal-apertura');
    expect(screen.getByTestId('apertura-AHORA')).toBeChecked();

    fireEvent.click(screen.getByTestId('confirmar-apertura'));

    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    const [payload] = mockCrear.mock.calls[0];
    expect(payload.enrollment_opens_days_before ?? null).toBeNull();
  });

  it('8: enseña la fecha en que abrirá, no solo los días', async () => {
    await abreElFormulario();
    rellena();
    haceLaPublica();
    pulsaCrear();
    await screen.findByTestId('modal-apertura');

    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.change(screen.getByTestId('apertura-dias'), { target: { value: '5' } });

    // El torneo empieza el 1 de junio de 2027, así que 5 días antes es el 27 de
    // mayo. «5 días antes» obliga a hacer la cuenta; la cuenta es lo que dice
    // si cae donde se quería
    const fecha = await screen.findByTestId('fecha-de-apertura');
    expect(fecha.textContent).toContain('27');
    expect(fecha).toHaveTextContent('apertura.abreEl');
  });
});
