import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router';

/**
 * Los países y sus vecinos en el formulario de competición (lote T3):
 *
 *   #     caso                                                    | qué pasa
 *   ------|---------------------------------------------------------|------------------------------
 *   T3-1  crear: al montar                                        | pide los países una vez y salen
 *         |                                                        | en el selector
 *   T3-2  editar A y pasar a B; llegan tarde los vecinos de A     | los vecinos son los de B
 *   T3-3  crear: Francia y luego España; Francia responde la última | los vecinos son los de España
 *   T3-3b igual con el segundo país: los vecinos del primer       | los del tercero son los del
 *         | adyacente llegan tarde                                 | segundo adyacente
 *   T3-4  edición cargada; cambia el idioma                       | ni se vuelve a pedir ni se
 *         |                                                        | rehace el formulario
 */
const TEXTOS = { es: (clave) => clave, en: (clave) => `en:${clave}` };
const idioma = vi.hoisted(() => ({ actual: 'es' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: TEXTOS[idioma.actual],
    i18n: { language: idioma.actual },
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
  formatCountryName: (pais) => pais?.code ?? '',
  sortCountriesByName: (paises) => paises || [],
}));
const mockDetalle = vi.fn();
const mockPaises = vi.fn();
const mockVecinos = vi.fn();
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: (...a) => mockPaises(...a) },
  getAdjacentCountriesUseCase: { execute: (...a) => mockVecinos(...a) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ countries, onChange }) => (
    <div>
      <p data-testid="paises-del-selector">
        {countries.map((c) => c.code).join(',')}
      </p>
      <button type="button" onClick={() => onChange('FR')}>
        elegir FR
      </button>
      <button type="button" onClick={() => onChange('ES')}>
        elegir ES
      </button>
    </div>
  ),
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({
  default: () => null,
}));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../components/ui/CountryFlag', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

const pais = (code) => ({ code, name_es: code, name_en: code });
const PAISES = ['ES', 'FR', 'PT', 'DE', 'BE', 'AD', 'IT'].map(pais);

const competicion = (id, codigos, name) => ({
  id,
  name,
  startDate: '2026-10-03',
  endDate: '2026-10-05',
  status: 'ACTIVE',
  maxPlayers: 12,
  playMode: 'SCRATCH',
  countries: codigos.map((code) => ({ code })),
  visibility: 'PRIVATE',
});

/** Lo que ofrece un selector de país adyacente, sin la opción vacía. */
const opciones = (id) =>
  [...document.querySelectorAll(`#${id} option`)]
    .map((o) => o.value)
    .filter(Boolean);

const conVecinosEnEspera = () => {
  const pendientes = {};
  mockVecinos.mockImplementation(
    (code) =>
      new Promise((resolver) => {
        (pendientes[code] ??= []).push(resolver);
      }),
  );
  return pendientes;
};

describe('CreateCompetition · países y vecinos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idioma.actual = 'es';
    mockPaises.mockResolvedValue(PAISES);
    mockVecinos.mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const abreElAlta = async () => {
    render(
      <MemoryRouter>
        <CreateCompetition />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    await screen.findByText('create.competitionDetails');
    await waitFor(() =>
      expect(
        screen.getByTestId('paises-del-selector'),
      ).not.toBeEmptyDOMElement(),
    );
  };

  it('T3-1: al crear, pide los países una vez y salen en el selector', async () => {
    await abreElAlta();

    expect(screen.getByTestId('paises-del-selector')).toHaveTextContent(
      'ES,FR,PT,DE,BE,AD,IT',
    );
    expect(mockPaises).toHaveBeenCalledTimes(1);
  });

  it('T3-3: Francia y luego España; si Francia responde la última, los vecinos son los de España', async () => {
    await abreElAlta();
    const pendientes = conVecinosEnEspera();

    fireEvent.click(screen.getByText('elegir FR'));
    fireEvent.click(screen.getByText('elegir ES'));
    await act(async () => {
      pendientes.ES[0]([pais('PT'), pais('AD')]);
    });
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE'), pais('IT')]);
    });
    fireEvent.click(screen.getByText('create.addAdjacentCountry'));

    expect(opciones('adjacentCountry1')).toEqual(['PT', 'AD']);
  });

  it('T3-3b: con el segundo país, los vecinos que llegan tarde del primer adyacente no pisan', async () => {
    await abreElAlta();
    mockVecinos.mockResolvedValueOnce([pais('PT'), pais('FR')]);
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    const pendientes = conVecinosEnEspera();

    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'FR' },
    });
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'PT' },
    });
    await act(async () => {
      pendientes.PT[0]([pais('ES')]);
    });
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE')]);
    });
    fireEvent.click(screen.getByText('create.addThirdCountry'));

    // Los del tercero: los vecinos de España, más los de Portugal que no sean
    // ni España ni Portugal. Nada de Alemania ni Bélgica, que son de Francia
    expect(opciones('adjacentCountry2')).toEqual(['FR']);
  });

  it('T3-3c: los vecinos tardíos del adyacente de otro principal no ofrecen tercer país', async () => {
    await abreElAlta();
    mockVecinos.mockResolvedValueOnce([pais('FR'), pais('PT')]);
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    const pendientes = conVecinosEnEspera();
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'PT' },
    });

    // Otro principal con los de Portugal en camino
    fireEvent.click(screen.getByText('elegir FR'));
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE')]);
    });
    await act(async () => {
      pendientes.PT[0]([pais('IT')]);
    });
    fireEvent.click(screen.getByText('create.addAdjacentCountry'));
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'DE' },
    });

    // Los de Alemania aún no han llegado: no hay tercer país que ofrecer
    expect(
      screen.queryByText('create.addThirdCountry'),
    ).not.toBeInTheDocument();
  });

  it('T3-3d: quitado el adyacente, sus vecinos tardíos no ofrecen tercer país', async () => {
    await abreElAlta();
    mockVecinos.mockResolvedValueOnce([pais('FR'), pais('PT')]);
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    const pendientes = conVecinosEnEspera();
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'PT' },
    });

    fireEvent.click(screen.getByLabelText('create.removeCountryField'));
    await act(async () => {
      pendientes.PT[0]([pais('IT')]);
    });
    fireEvent.click(screen.getByText('create.addAdjacentCountry'));
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'FR' },
    });

    expect(
      screen.queryByText('create.addThirdCountry'),
    ).not.toBeInTheDocument();
  });

  it('T3-2b: lo que se pidió en el formulario de A y llega cargada B no pisa los vecinos de B', async () => {
    mockDetalle.mockImplementation((id) =>
      Promise.resolve(
        id === 'c-1'
          ? competicion('c-1', ['FR', 'BE'], 'La de A')
          : competicion('c-2', ['ES', 'PT', 'AD'], 'La de B'),
      ),
    );
    mockVecinos.mockImplementation((code) =>
      Promise.resolve(
        {
          FR: [pais('BE'), pais('DE')],
          BE: [],
          ES: [pais('PT'), pais('AD')],
          PT: [pais('IT')],
        }[code] ?? [],
      ),
    );
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route
            path="/competitions/:id/edit"
            element={<CreateCompetition />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('La de A');
    let deAlemania;
    mockVecinos.mockImplementationOnce(
      () =>
        new Promise((r) => {
          deAlemania = r;
        }),
    );
    fireEvent.change(document.querySelector('#adjacentCountry1'), {
      target: { value: 'DE' },
    });

    fireEvent.click(screen.getByText('a la B'));
    expect(await screen.findByDisplayValue('La de B')).toBeInTheDocument();
    await act(async () => {
      deAlemania([pais('IT'), pais('AT')]);
    });

    expect(opciones('adjacentCountry2')).toEqual(['AD', 'IT']);
  });

  it('T3-2c: otro principal elegido en el formulario de A, con B cargada, no pisa los vecinos de B', async () => {
    mockDetalle.mockImplementation((id) =>
      Promise.resolve(
        id === 'c-1'
          ? competicion('c-1', ['FR', 'BE'], 'La de A')
          : competicion('c-2', ['IT', 'AD'], 'La de B'),
      ),
    );
    mockVecinos.mockImplementation((code) =>
      Promise.resolve(
        { FR: [pais('BE'), pais('DE')], IT: [pais('AD'), pais('FR')] }[code] ??
          [],
      ),
    );
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route
            path="/competitions/:id/edit"
            element={<CreateCompetition />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('La de A');
    let deEspana;
    mockVecinos.mockImplementationOnce(
      () =>
        new Promise((r) => {
          deEspana = r;
        }),
    );
    fireEvent.click(screen.getByText('elegir ES'));

    fireEvent.click(screen.getByText('a la B'));
    expect(await screen.findByDisplayValue('La de B')).toBeInTheDocument();
    await act(async () => {
      deEspana([pais('PT')]);
    });

    expect(opciones('adjacentCountry1')).toEqual(['AD', 'FR']);
  });

  it('T3-5b: si la carga de A falla después de pasar a B, ni avisa ni redirige', async () => {
    const toast = (await import('../utils/toast')).default;
    let fallaA;
    mockDetalle.mockImplementation((id) =>
      id === 'c-1'
        ? new Promise((_, rechazar) => {
            fallaA = rechazar;
          })
        : Promise.resolve(competicion('c-2', ['ES'], 'La de B')),
    );
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route
            path="/competitions/:id/edit"
            element={<CreateCompetition />}
          />
          <Route path="/competitions" element={<p>el listado</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockDetalle).toHaveBeenCalledWith('c-1'));
    fireEvent.click(screen.getByText('a la B'));
    expect(await screen.findByDisplayValue('La de B')).toBeInTheDocument();

    await act(async () => {
      fallaA(new Error('sin red'));
    });

    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByText('el listado')).not.toBeInTheDocument();
  });

  it('T3-3e: elegido el primer adyacente y luego ninguno, sus vecinos tardíos no ofrecen tercer país', async () => {
    await abreElAlta();
    mockVecinos.mockResolvedValueOnce([pais('FR'), pais('PT')]);
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    const pendientes = conVecinosEnEspera();
    const adyacente = () => document.querySelector('#adjacentCountry1');

    fireEvent.change(adyacente(), { target: { value: 'FR' } });
    fireEvent.change(adyacente(), { target: { value: '' } });
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE')]);
    });
    fireEvent.change(adyacente(), { target: { value: 'PT' } });

    // Los de Portugal aún no han llegado: no hay tercer país que ofrecer
    expect(
      screen.queryByText('create.addThirdCountry'),
    ).not.toBeInTheDocument();
  });

  it('T3-3f: de Francia a Portugal, la lista del tercer país de Francia no se ve mientras llegan los de Portugal', async () => {
    await abreElAlta();
    mockVecinos.mockResolvedValueOnce([pais('FR'), pais('PT')]);
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    const pendientes = conVecinosEnEspera();
    const adyacente = () => document.querySelector('#adjacentCountry1');

    fireEvent.change(adyacente(), { target: { value: 'FR' } });
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE')]);
    });
    expect(screen.getByText('create.addThirdCountry')).toBeInTheDocument();

    fireEvent.change(adyacente(), { target: { value: 'PT' } });

    expect(
      screen.queryByText('create.addThirdCountry'),
    ).not.toBeInTheDocument();
    await act(async () => {
      pendientes.PT[0]([pais('IT')]);
    });
    fireEvent.click(screen.getByText('create.addThirdCountry'));
    expect(opciones('adjacentCountry2')).toEqual(['FR', 'IT']);
  });

  it('T3-2: editando A y pasando a B, los vecinos de A que llegan tarde no pisan los de B', async () => {
    mockDetalle.mockImplementation((id) =>
      Promise.resolve(
        id === 'c-1'
          ? competicion('c-1', ['FR', 'BE'], 'La de A')
          : competicion('c-2', ['ES', 'PT', 'AD'], 'La de B'),
      ),
    );
    const pendientes = conVecinosEnEspera();
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Link to="/competitions/c-2/edit">a la B</Link>
        <Routes>
          <Route
            path="/competitions/:id/edit"
            element={<CreateCompetition />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(pendientes.FR).toHaveLength(1));

    fireEvent.click(screen.getByText('a la B'));
    await waitFor(() => expect(pendientes.ES).toHaveLength(1));
    await act(async () => {
      pendientes.ES[0]([pais('PT'), pais('AD')]);
    });
    await waitFor(() => expect(pendientes.PT).toHaveLength(1));
    await act(async () => {
      pendientes.PT[0]([pais('ES'), pais('IT')]);
    });
    expect(await screen.findByDisplayValue('La de B')).toBeInTheDocument();

    // Ahora los de A: Francia y, tras ella, Bélgica
    await act(async () => {
      pendientes.FR[0]([pais('DE'), pais('BE')]);
    });
    await act(async () => {
      pendientes.BE?.[0]?.([pais('FR'), pais('DE')]);
    });
    await act(async () => {});

    expect(opciones('adjacentCountry1')).toEqual(['PT', 'AD']);
    expect(opciones('adjacentCountry2')).toEqual(['AD', 'IT']);
  });

  it('T3-4: con la edición cargada, cambiar de idioma no la vuelve a pedir ni rehace el formulario', async () => {
    mockDetalle.mockResolvedValue(competicion('c-1', ['ES'], 'La de A'));
    const arbol = () => (
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Routes>
          <Route
            path="/competitions/:id/edit"
            element={<CreateCompetition />}
          />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(arbol());
    const nombre = await screen.findByDisplayValue('La de A');
    fireEvent.change(nombre, { target: { value: 'La de A, retocada' } });

    idioma.actual = 'en';
    rerender(arbol());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockDetalle).toHaveBeenCalledTimes(1);
    expect(mockPaises).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('La de A, retocada')).toBeInTheDocument();
  });
});
