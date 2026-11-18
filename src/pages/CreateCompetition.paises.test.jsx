import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Los países y sus campos en el alta, fijados tal como son HOY antes de partir
 * la página en piezas (refactor sin cambios):
 *
 *   #     caso                                               | qué pasa
 *   ------|----------------------------------------------------|------------------------------
 *   PA1   cambia el país principal                           | se quedan solo sus campos
 *   PA2   se quita el adyacente                              | se van sus campos, los del tercero
 *         |                                                   | y el selector del tercero
 *   PA3   se quita el tercero                                | solo se van los suyos
 *   PA4   se vacía el principal                              | fuera los adyacentes; los campos
 *         |                                                   | se QUEDAN (rareza que se conserva)
 *   PA5   «añadir adyacente» / «añadir tercer país»          | solo con país (o adyacente) y vecinos
 *   PA6   el tercer país                                     | no ofrece el adyacente
 *   PA7   «pedir un campo nuevo»                             | el modal con el país de su bloque;
 *         |                                                   | lo pedido entra en ese país; al
 *         |                                                   | cerrar, sin país
 *   PA8   un campo pendiente de aprobar                      | lo dice
 *   PA9   cada bloque cuenta los suyos; la papelera          | quita el suyo aunque estén
 *         |                                                   | intercalados con los de otro país
 *   PA10  los pasos del alta                                 | tipo → modo (Ryder) → formulario;
 *         |                                                   | editando, el formulario
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores && !('defaultValue' in valores)
        ? `${clave} ${JSON.stringify(valores)}`
        : clave,
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
const USUARIO = vi.hoisted(() => ({
  user: { id: 'u-1', gender: 'MALE' },
  loading: false,
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => USUARIO }));
vi.mock('../utils/toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock('../services/countries', () => ({
  formatCountryName: (pais) => `nombre ${pais?.code}`,
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  updateStrokePlaySettingsUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn() },
  getAdjacentCountriesUseCase: { execute: vi.fn() },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
  configureScheduleUseCase: { execute: vi.fn() },
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ countries, onChange }) => (
    <div>
      <p data-testid="paises-listos">{countries.length}</p>
      {['ES', 'FR', 'IT'].map((code) => (
        <button key={code} type="button" onClick={() => onChange(code)}>
          {`elegir ${code}`}
        </button>
      ))}
      <button type="button" onClick={() => onChange('')}>
        vaciar país
      </button>
    </div>
  ),
}));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ countryCode, onCourseSelect, onRequestNewCourse }) => (
    <div>
      {[1, 2].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() =>
            onCourseSelect({
              id: `${countryCode}-${n}`,
              name: `Campo ${countryCode}-${n}`,
            })
          }
        >
          {`campo ${n} de ${countryCode}`}
        </button>
      ))}
      <button type="button" onClick={onRequestNewCourse}>
        {`pedir campo en ${countryCode}`}
      </button>
    </div>
  ),
}));
// Lo que «crea» el modal: un test puede cambiarlo (B1, campos sin id)
const campoPedido = vi.hoisted(() => ({ siguiente: null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({
  default: ({ isOpen, countryCode, onClose, onSuccess }) => (
    <div>
      <p data-testid="modal-de-campo">{`${isOpen}:${countryCode}`}</p>
      <button
        type="button"
        onClick={() =>
          onSuccess(
            campoPedido.siguiente ?? {
              id: 'pedido',
              name: 'Campo pedido',
              approvalStatus: 'PENDING_APPROVAL',
            },
          )
        }
      >
        campo pedido creado
      </button>
      <button type="button" onClick={onClose}>
        cerrar modal
      </button>
    </div>
  ),
}));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../components/ui/CountryFlag', () => ({ CountryFlag: () => null }));

// Los campos que se mandan, aunque no se vean: la validación no estorba
const mockValidar = vi.hoisted(() => vi.fn(() => null));
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));

const composicion = await import('../composition');
const CreateCompetition = (await import('./CreateCompetition')).default;

const pais = (code) => ({ code, name_es: code, name_en: code });
const PAISES = ['ES', 'FR', 'PT', 'IT'].map(pais);
const VECINOS = {
  ES: ['FR', 'PT'],
  FR: ['ES', 'IT', 'PT'],
  PT: ['ES'],
  IT: [],
};

const escribe = (elemento, valor) =>
  fireEvent.change(elemento, { target: { value: valor } });

/** Lo que ofrece un selector de país, sin la opción vacía. */
const opciones = (id) =>
  [...document.querySelectorAll(`#${id} option`)]
    .map((o) => o.value)
    .filter(Boolean);

/** Los campos que se ven, en orden. */
const camposALaVista = () =>
  screen.queryAllByText(/^Campo /).map((nodo) => nodo.textContent);

const abreElAlta = async (tipo = 'RYDER_CUP') => {
  render(
    <MemoryRouter>
      <CreateCompetition />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByTestId(`tipo-${tipo}`));
  if (tipo === 'RYDER_CUP')
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await waitFor(() =>
    expect(screen.getByTestId('paises-listos')).toHaveTextContent('4'),
  );
};

/** España; Francia de adyacente y Portugal de tercero. */
const eligeLosTresPaises = async () => {
  fireEvent.click(screen.getByText('elegir ES'));
  fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
  escribe(document.querySelector('#adjacentCountry1'), 'FR');
  fireEvent.click(await screen.findByText('create.addThirdCountry'));
  escribe(document.querySelector('#adjacentCountry2'), 'PT');
};

const quitar = (campo) =>
  fireEvent.click(
    screen.getByRole('button', {
      name: `detail.golfCourses.remove {"name":"${campo}"}`,
    }),
  );

const camposEnviados = async () => {
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() =>
    expect(
      composicion.createCompetitionWithGolfCoursesUseCase.execute,
    ).toHaveBeenCalled(),
  );
  return composicion.createCompetitionWithGolfCoursesUseCase.execute.mock
    .calls[0][1];
};

/** El bloque de campos de un país: el que tiene su título. */
const bloqueDe = (code) =>
  screen.getByText(`nombre ${code}`, { selector: 'h4' }).closest('div')
    .parentElement;

describe('CreateCompetition · países y campos del alta (caracterización)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campoPedido.siguiente = null;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValidar.mockImplementation(() => null);
    composicion.fetchCountriesUseCase.execute.mockResolvedValue(PAISES);
    composicion.getAdjacentCountriesUseCase.execute.mockImplementation(
      async (code) => (VECINOS[code] ?? []).map(pais),
    );
    composicion.createCompetitionWithGolfCoursesUseCase.execute.mockResolvedValue(
      { competition: { id: 'nueva' }, successCount: 1, failedCourses: [] },
    );
  });

  it('PA1: al cambiar el país principal se quedan solo los campos de ese país', async () => {
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    escribe(document.querySelector('#adjacentCountry1'), 'FR');
    fireEvent.click(await screen.findByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 1 de FR'));
    expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo FR-1']);

    fireEvent.click(screen.getByText('elegir FR'));

    expect(camposALaVista()).toEqual(['Campo FR-1']);
    expect(document.querySelector('#adjacentCountry1')).toBeNull();
    expect(await camposEnviados()).toEqual([
      { id: 'FR-1', name: 'Campo FR-1' },
    ]);
  });

  it('PA2: quitar el adyacente quita sus campos, los del tercero y el tercer selector', async () => {
    await abreElAlta();
    await eligeLosTresPaises();
    fireEvent.click(screen.getByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 1 de FR'));
    fireEvent.click(screen.getByText('campo 1 de PT'));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'create.removeCountryField {"field":"create.adjacentCountry"}',
      }),
    );

    expect(camposALaVista()).toEqual(['Campo ES-1']);
    expect(document.querySelector('#adjacentCountry1')).toBeNull();
    expect(document.querySelector('#adjacentCountry2')).toBeNull();
    expect(screen.queryByText('create.addThirdCountry')).toBeNull();
    expect(await camposEnviados()).toEqual([
      { id: 'ES-1', name: 'Campo ES-1' },
    ]);
  });

  it('PA3: quitar el tercer país solo quita los suyos', async () => {
    await abreElAlta();
    await eligeLosTresPaises();
    fireEvent.click(screen.getByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 1 de FR'));
    fireEvent.click(screen.getByText('campo 1 de PT'));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'create.removeCountryField {"field":"create.thirdCountry"}',
      }),
    );

    expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo FR-1']);
    expect(document.querySelector('#adjacentCountry1')).toHaveValue('FR');
    expect(document.querySelector('#adjacentCountry2')).toBeNull();
    expect(screen.getByText('create.addThirdCountry')).toBeInTheDocument();
  });

  it('PA4: vaciar el principal quita los adyacentes pero los campos se quedan', async () => {
    await abreElAlta();
    await eligeLosTresPaises();
    fireEvent.click(screen.getByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 1 de FR'));

    fireEvent.click(screen.getByText('vaciar país'));

    expect(document.querySelector('#adjacentCountry1')).toBeNull();
    expect(document.querySelector('#adjacentCountry2')).toBeNull();
    expect(screen.queryByText('create.addAdjacentCountry')).toBeNull();
    expect(camposALaVista()).toEqual([]);
    expect(await camposEnviados()).toEqual([
      { id: 'ES-1', name: 'Campo ES-1' },
      { id: 'FR-1', name: 'Campo FR-1' },
    ]);
  });

  it('PA5: «añadir adyacente» y «añadir tercer país» solo con país y con vecinos', async () => {
    await abreElAlta();
    expect(screen.queryByText('create.addAdjacentCountry')).toBeNull();

    // Italia no tiene vecinos: no hay adyacente que ofrecer
    fireEvent.click(screen.getByText('elegir IT'));
    await screen.findByText('campo 1 de IT');
    expect(screen.queryByText('create.addAdjacentCountry')).toBeNull();

    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    // Ya abierto, el botón se va; sin adyacente elegido, no hay tercer país
    expect(screen.queryByText('create.addAdjacentCountry')).toBeNull();
    expect(screen.queryByText('create.addThirdCountry')).toBeNull();

    // Mientras llegan los vecinos del adyacente, tampoco
    let llegan;
    composicion.getAdjacentCountriesUseCase.execute.mockImplementationOnce(
      () =>
        new Promise((resolver) => {
          llegan = resolver;
        }),
    );
    escribe(document.querySelector('#adjacentCountry1'), 'FR');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText('create.addThirdCountry')).toBeNull();
    await act(async () => {
      llegan(VECINOS.FR.map(pais));
    });
    fireEvent.click(await screen.findByText('create.addThirdCountry'));
    expect(screen.queryByText('create.addThirdCountry')).toBeNull();
  });

  it('PA6: el tercer país no ofrece el adyacente', async () => {
    await abreElAlta();
    await eligeLosTresPaises();

    // Los del principal (FR, PT) más los de Francia que no son ni España ni
    // Francia (IT); sin Francia, que ya es el adyacente
    expect(opciones('adjacentCountry1')).toEqual(['FR', 'PT']);
    expect(opciones('adjacentCountry2')).toEqual(['PT', 'IT']);
  });

  it('PA7: pedir un campo nuevo abre el modal con el país de su bloque y lo añade ahí', async () => {
    await abreElAlta();
    await eligeLosTresPaises();
    expect(screen.getByTestId('modal-de-campo')).toHaveTextContent(
      'false:null',
    );

    fireEvent.click(screen.getByText('pedir campo en FR'));
    expect(screen.getByTestId('modal-de-campo')).toHaveTextContent('true:FR');

    fireEvent.click(screen.getByText('campo pedido creado'));
    expect(
      within(bloqueDe('FR')).getByText('Campo pedido'),
    ).toBeInTheDocument();
    expect(within(bloqueDe('ES')).queryByText('Campo pedido')).toBeNull();

    fireEvent.click(screen.getByText('cerrar modal'));
    expect(screen.getByTestId('modal-de-campo')).toHaveTextContent(
      'false:null',
    );
    // Cerrado y sin país, lo que llegue ya no se añade a ninguno
    fireEvent.click(screen.getByText('campo pedido creado'));
    expect(screen.getAllByText('Campo pedido')).toHaveLength(1);
  });

  it('PA8: un campo pendiente de aprobar lo dice', async () => {
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('campo 1 de ES'));
    expect(screen.queryByText('create.coursePendingApproval')).toBeNull();

    fireEvent.click(screen.getByText('pedir campo en ES'));
    fireEvent.click(screen.getByText('campo pedido creado'));

    expect(screen.getAllByText('create.coursePendingApproval')).toHaveLength(1);
  });

  it('PA9: cada bloque cuenta los suyos y la papelera quita el suyo, intercalados', async () => {
    await abreElAlta();
    await eligeLosTresPaises();
    fireEvent.click(screen.getByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 1 de FR'));
    fireEvent.click(screen.getByText('campo 2 de ES'));
    fireEvent.click(screen.getByText('campo 1 de PT'));
    fireEvent.click(screen.getByText('campo 2 de FR'));

    expect(
      within(bloqueDe('ES')).getByText(/create\.coursesSelected/),
    ).toHaveTextContent('(create.coursesSelected {"count":2})');
    expect(
      within(bloqueDe('FR')).getByText(/create\.coursesSelected/),
    ).toHaveTextContent('(create.coursesSelected {"count":2})');
    expect(
      within(bloqueDe('PT')).getByText(/create\.coursesSelected/),
    ).toHaveTextContent('(create.coursesSelected {"count":1})');

    quitar('Campo ES-2');
    expect(camposALaVista()).toEqual([
      'Campo ES-1',
      'Campo FR-1',
      'Campo FR-2',
      'Campo PT-1',
    ]);
    quitar('Campo FR-2');
    quitar('Campo PT-1');
    expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo FR-1']);
    expect(
      within(bloqueDe('PT')).getByText(/create\.coursesSelected/),
    ).toHaveTextContent('(create.coursesSelected {"count":0})');
  });

  it('B3: al quitar el primero, la fila del segundo es la suya (no la del quitado reutilizada)', async () => {
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('campo 1 de ES'));
    fireEvent.click(screen.getByText('campo 2 de ES'));
    const papelera = (campo) =>
      screen.getByRole('button', {
        name: `detail.golfCourses.remove {"name":"${campo}"}`,
      });
    const delSegundo = papelera('Campo ES-2');
    const delPrimero = papelera('Campo ES-1');
    // Con el teclado: el foco en la papelera del primero
    delPrimero.focus();

    quitar('Campo ES-1');

    // La del primero se va con su fila: un segundo Enter no quita el otro
    expect(delPrimero).not.toBeInTheDocument();
    expect(papelera('Campo ES-2')).toBe(delSegundo);
  });

  it('B3: sin id también: al quitar el primero, la fila y la papelera del segundo siguen siendo suyas, y la clave no se manda', async () => {
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    for (const nombre of ['Campo sin id A', 'Campo sin id B']) {
      campoPedido.siguiente = { name: nombre };
      fireEvent.click(await screen.findByText('pedir campo en ES'));
      fireEvent.click(screen.getByText('campo pedido creado'));
    }
    const papelera = (campo) =>
      screen.getByRole('button', {
        name: `detail.golfCourses.remove {"name":"${campo}"}`,
      });
    const delSegundo = papelera('Campo sin id B');
    const delPrimero = papelera('Campo sin id A');
    delPrimero.focus();

    quitar('Campo sin id A');

    expect(delPrimero).not.toBeInTheDocument();
    expect(papelera('Campo sin id B')).toBe(delSegundo);
    // La identidad de la fila es del formulario: no viaja en la petición
    expect(await camposEnviados()).toEqual([
      { id: undefined, name: 'Campo sin id B' },
    ]);
  });

  it('B1: dos campos sin id del mismo país; la papelera del segundo quita el segundo', async () => {
    await abreElAlta();
    fireEvent.click(screen.getByText('elegir ES'));
    for (const nombre of ['Campo sin id A', 'Campo sin id B']) {
      campoPedido.siguiente = { name: nombre };
      fireEvent.click(await screen.findByText('pedir campo en ES'));
      fireEvent.click(screen.getByText('campo pedido creado'));
    }
    expect(camposALaVista()).toEqual(['Campo sin id A', 'Campo sin id B']);

    quitar('Campo sin id B');

    expect(camposALaVista()).toEqual(['Campo sin id A']);
  });

  describe('A: los campos de un país que deja de estar en la competición', () => {
    // España, Francia de adyacente e Italia de tercero, con un campo cada uno
    const conLosTres = async () => {
      fireEvent.click(screen.getByText('elegir ES'));
      fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
      escribe(document.querySelector('#adjacentCountry1'), 'FR');
      fireEvent.click(await screen.findByText('create.addThirdCountry'));
      escribe(document.querySelector('#adjacentCountry2'), 'IT');
      fireEvent.click(screen.getByText('campo 1 de ES'));
      fireEvent.click(screen.getByText('campo 1 de FR'));
      fireEvent.click(screen.getByText('campo 1 de IT'));
      expect(camposALaVista()).toEqual([
        'Campo ES-1',
        'Campo FR-1',
        'Campo IT-1',
      ]);
    };

    it('A1: cambiar el adyacente quita los campos del anterior; los del principal se quedan', async () => {
      await abreElAlta();
      fireEvent.click(screen.getByText('elegir ES'));
      fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
      escribe(document.querySelector('#adjacentCountry1'), 'FR');
      fireEvent.click(await screen.findByText('campo 1 de ES'));
      fireEvent.click(screen.getByText('campo 1 de FR'));

      escribe(document.querySelector('#adjacentCountry1'), 'PT');

      expect(camposALaVista()).toEqual(['Campo ES-1']);
      expect(await camposEnviados()).toEqual([
        { id: 'ES-1', name: 'Campo ES-1' },
      ]);
    });

    it('A2: con tercer país, cambiar el adyacente quita los campos de los dos', async () => {
      await abreElAlta();
      await conLosTres();

      escribe(document.querySelector('#adjacentCountry1'), 'PT');

      expect(document.querySelector('#adjacentCountry2')).toBeNull();
      expect(camposALaVista()).toEqual(['Campo ES-1']);
      expect(await camposEnviados()).toEqual([
        { id: 'ES-1', name: 'Campo ES-1' },
      ]);
    });

    it('A8: el tercer país elegido como adyacente conserva sus campos; los del adyacente anterior se van', async () => {
      await abreElAlta();
      await eligeLosTresPaises();
      fireEvent.click(screen.getByText('campo 1 de ES'));
      fireEvent.click(screen.getByText('campo 1 de FR'));
      fireEvent.click(screen.getByText('campo 1 de PT'));
      // Portugal es vecino de España: el selector del adyacente lo ofrece
      expect(opciones('adjacentCountry1')).toContain('PT');

      escribe(document.querySelector('#adjacentCountry1'), 'PT');

      expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo PT-1']);
      expect(await camposEnviados()).toEqual([
        { id: 'ES-1', name: 'Campo ES-1' },
        { id: 'PT-1', name: 'Campo PT-1' },
      ]);
    });

    it('A3: cambiar el tercer país quita los suyos; los del principal y el adyacente se quedan', async () => {
      await abreElAlta();
      await conLosTres();

      escribe(document.querySelector('#adjacentCountry2'), 'PT');

      expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo FR-1']);
      expect(await camposEnviados()).toEqual([
        { id: 'ES-1', name: 'Campo ES-1' },
        { id: 'FR-1', name: 'Campo FR-1' },
      ]);
    });

    it('A4: el tercer país en «ninguno» quita sus campos, como su papelera', async () => {
      await abreElAlta();
      await conLosTres();

      escribe(document.querySelector('#adjacentCountry2'), '');

      expect(document.querySelector('#adjacentCountry2')).toHaveValue('');
      expect(camposALaVista()).toEqual(['Campo ES-1', 'Campo FR-1']);
      expect(await camposEnviados()).toEqual([
        { id: 'ES-1', name: 'Campo ES-1' },
        { id: 'FR-1', name: 'Campo FR-1' },
      ]);
    });
  });

  // A5 con la validación DE VERDAD. Ningún selector deja ya ese estado; se
  // llega por el modal de pedir campo, que aquí es un doble que sigue a mano
  // tras quitar el país desde el que se pidió (el real tapa la pantalla). Así
  // entra un campo de Francia en una competición solo de España
  it('A5: un campo de un país que ya no está no se manda y se avisa (validación real)', async () => {
    const { validateCompetitionForm } = await vi.importActual(
      '../utils/competitionFormValidation',
    );
    mockValidar.mockImplementation(validateCompetitionForm);
    await abreElAlta('MEDAL');
    escribe(screen.getByTestId('campo-nombre'), 'Medal de junio');
    escribe(document.querySelector('#startDate'), '2030-06-01');
    escribe(document.querySelector('#endDate'), '2030-06-03');
    fireEvent.click(screen.getByText('elegir ES'));
    fireEvent.click(await screen.findByText('campo 1 de ES'));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    escribe(document.querySelector('#adjacentCountry1'), 'FR');
    fireEvent.click(await screen.findByText('pedir campo en FR'));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'create.removeCountryField {"field":"create.adjacentCountry"}',
      }),
    );
    fireEvent.click(screen.getByText('campo pedido creado'));

    fireEvent.submit(document.querySelector('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'create.errors.golfCoursesOutsideCountries',
    );
    expect(
      composicion.createCompetitionWithGolfCoursesUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  describe('PA10: los pasos del alta', () => {
    const pinta = (ruta = '/competitions/create') =>
      render(
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route
              path="/competitions/create"
              element={<CreateCompetition />}
            />
            <Route
              path="/competitions/:id/edit"
              element={<CreateCompetition />}
            />
          </Routes>
        </MemoryRouter>,
      );
    const enPantalla = () => ({
      tipo: screen.queryByTestId('tipo-RYDER_CUP') !== null,
      modo: screen.queryByTestId('modo-RYDER_CUP') !== null,
      formulario: document.querySelector('form') !== null,
    });

    it('sin tipo, solo el tipo', async () => {
      pinta();
      await screen.findByTestId('tipo-RYDER_CUP');
      expect(enPantalla()).toEqual({
        tipo: true,
        modo: false,
        formulario: false,
      });
    });

    it('una Ryder pide el modo antes del formulario', async () => {
      pinta();
      fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
      expect(enPantalla()).toEqual({
        tipo: false,
        modo: true,
        formulario: false,
      });
      fireEvent.click(screen.getByTestId('modo-MANUAL'));
      expect(enPantalla()).toEqual({
        tipo: false,
        modo: true,
        formulario: true,
      });
    });

    it('un Stableford va directo al formulario', async () => {
      pinta();
      fireEvent.click(await screen.findByTestId('tipo-STABLEFORD'));
      expect(enPantalla()).toEqual({
        tipo: false,
        modo: false,
        formulario: true,
      });
    });

    it('editando, el formulario sin pasos', async () => {
      composicion.getCompetitionDetailUseCase.execute.mockResolvedValue({
        id: 'c-1',
        name: 'Stableford guardado',
        status: 'ACTIVE',
        tournamentType: 'STABLEFORD',
        hasTeams: false,
        startDate: '2030-10-10',
        endDate: '2030-10-12',
        countries: [{ code: 'ES' }],
      });
      composicion.getCompetitionGolfCoursesUseCase.execute.mockResolvedValue(
        [],
      );
      pinta('/competitions/c-1/edit');
      await waitFor(() =>
        expect(screen.getByTestId('campo-nombre')).toHaveValue(
          'Stableford guardado',
        ),
      );
      expect(enPantalla()).toEqual({
        tipo: false,
        modo: false,
        formulario: true,
      });
    });
  });
});
