import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * LA TABLA de la FE #644: el mismo campo de golf no se añade dos veces.
 *
 * Visto en el navegador: un torneo en Portugal acabó con «Portugal (5 campos
 * seleccionados)» y cinco filas de «Axis Golfe Ponte de Lima». Y no queda en un
 * susto: los campos se enganchan uno a uno DESPUÉS de crear el torneo, así que
 * al pulsar «Crear» el torneo se crea, el primer campo entra, los otros cuatro
 * los rechaza el backend y el organizador se queda con un torneo hecho y un
 * error que lista cuatro veces el mismo campo.
 *
 *   #   caso                                 | qué pasa
 *   ----|----------------------------------------|----------------------------
 *   1   se elige el mismo campo dos veces     | una sola fila, y se avisa
 *   2   se eligen dos campos distintos        | dos filas
 *   3   el buscador recibe los ya elegidos    | para no volver a ofrecerlos
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

const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('../services/countries', () => ({
  formatCountryName: () => 'España',
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  // La página descarta los países sin `name_en`/`name_es`, así que con `name` a
  // secas la lista se quedaba vacía y no se podía elegir ninguno
  fetchCountriesUseCase: {
    execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]),
  },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
// La sección de campos de golf solo existe con un país elegido, así que el
// selector tiene que poder elegirlo
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange('ES')}>elegir país</button>
  ),
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

// El buscador de verdad pregunta al backend. Aquí se sustituye por dos botones
// que hacen lo único que importa para esta tabla: avisar de un campo elegido.
// Y deja ver qué ids recibe, que es como el formulario le dice «estos ya están»
const CAMPO_A = { id: 'gc-1', name: 'Axis Golfe Ponte de Lima' };
const CAMPO_B = { id: 'gc-2', name: 'Real Club de Golf' };
let idsRecibidos = [];

vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect, idsYaElegidos = [] }) => {
    idsRecibidos = idsYaElegidos;
    return (
      <div>
        <button type="button" onClick={() => onCourseSelect(CAMPO_A)}>elegir A</button>
        <button type="button" onClick={() => onCourseSelect(CAMPO_B)}>elegir B</button>
      </div>
    );
  },
}));

const CreateCompetition = (await import('./CreateCompetition')).default;

const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  // Y el modo de configuración, que es el paso siguiente (FE #695). Estilo
  // RyderCup es lo que estas pantallas daban por hecho
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
  // Los países llegan del backend: hasta que no están, elegir uno no prende.
  // Se espera a que estén (un tick de microtareas) en vez de repetir el click,
  // que dejaba el test dando vueltas
  await act(async () => { await Promise.resolve(); });
  fireEvent.click(screen.getByText('elegir país'));
  await screen.findByText('elegir A');
};

/** Filas de campos ya añadidos: las que llevan su botón de quitar. */
const camposAnadidos = () =>
  screen.queryAllByText(CAMPO_A.name).concat(screen.queryAllByText(CAMPO_B.name));

describe('CreateCompetition · campos de golf repetidos (FE #644)', () => {
  beforeEach(() => {
    idsRecibidos = [];
    toast.info.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('1: el mismo campo dos veces se queda en uno, y se avisa', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByText('elegir A'));
    fireEvent.click(screen.getByText('elegir A'));

    expect(screen.queryAllByText(CAMPO_A.name)).toHaveLength(1);
    expect(toast.info).toHaveBeenCalled();
  });

  it('2: dos campos distintos son dos campos', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByText('elegir A'));
    fireEvent.click(screen.getByText('elegir B'));

    expect(camposAnadidos()).toHaveLength(2);
  });

  it('3: el buscador recibe los que ya están, para no volver a ofrecerlos', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByText('elegir A'));

    expect(idsRecibidos).toContain(CAMPO_A.id);
  });
});
