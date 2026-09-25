import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * LA TABLA de la FE #639, en la pantalla: el tipo se elige ANTES de rellenar
 * nada, y elegir Ryder Cup tiene que llevar exactamente al formulario de hoy.
 * Esta issue añade un paso delante; no cambia nada detrás.
 *
 *   #   caso                                  | qué pasa
 *   ----|----------------------------------------|------------------------
 *   1   se entra a crear competición            | sale el tipo, NO el formulario
 *   2   se elige Ryder Cup                      | sale el formulario de siempre
 *   3   se vuelve atrás                         | otra vez el tipo…
 *   4   …y se vuelve a entrar                   | …con lo escrito intacto
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
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name: 'España' }]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
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

describe('CreateCompetition · elegir el tipo primero (FE #639)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('1: al entrar se pregunta el tipo, no se enseña el formulario', async () => {
    pinta();

    expect(await screen.findByTestId('tipo-RYDER_CUP')).toBeInTheDocument();
    expect(screen.queryByLabelText(/create\.competitionName/)).not.toBeInTheDocument();
  });

  it('2: elegir Ryder Cup lleva al modo y, con él, al formulario de siempre', async () => {
    // El modo de configuración se pregunta en medio desde la FE #695
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));

    expect(await screen.findByText('create.competitionDetails')).toBeInTheDocument();
    expect(screen.queryByTestId('tipo-RYDER_CUP')).not.toBeInTheDocument();
  });

  it('2b: y el formulario empieza por arriba, no por donde se quedó el scroll', async () => {
    // En el móvil la lista de tipos ocupa toda la pantalla y se llega al tercero
    // con scroll. Al elegir, el formulario aparecía por el final: lo primero que
    // veía el organizador era «Límite de Hándicap de Juego». Visto a 360 px
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    pinta();
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));

    await screen.findByText('create.competitionDetails');
    expect(scrollTo).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('3 y 4: volver atrás no cuesta lo escrito', async () => {
    pinta();

    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    const nombre = await screen.findByTestId('campo-nombre');
    fireEvent.change(nombre, { target: { value: 'Ryder de los amigos' } });

    fireEvent.click(screen.getByTestId('volver-al-tipo'));
    expect(await screen.findByTestId('tipo-RYDER_CUP')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    expect(await screen.findByTestId('campo-nombre')).toHaveValue('Ryder de los amigos');
  });

  it('5: editando NUNCA se pregunta el tipo, ni aunque falle la carga de países', async () => {
    // `isEditMode` se ponía dentro del efecto que carga la competición, y ese
    // efecto sale antes si los países no han llegado. Sin cobertura —el caso
    // normal de esta aplicación— la pantalla de edición se quedaba enseñando el
    // selector, y al enviar el formulario tomaba la rama de CREAR: una
    // competición nueva en vez de la edición pedida (`/code-review`)
    const { fetchCountriesUseCase } = await import('../composition');
    fetchCountriesUseCase.execute.mockRejectedValueOnce(new Error('sin red'));

    pintaEdicion();

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('tipo-RYDER_CUP')).not.toBeInTheDocument();
    expect(screen.queryByTestId('volver-al-tipo')).not.toBeInTheDocument();
  });


  /**
   * LA TABLA de la FE #637 en la pantalla: lo que el servidor rellena solo deja
   * de ser una decisión que hay que tomar para poder pulsar el botón.
   *
   *   #   caso                        | qué se ve
   *   ----|------------------------------|---------------------------------
   *   1   al abrir el formulario        | nombre, fechas, país y campos
   *   2   lo demás                      | plegado, con su resumen a la vista
   *   3   se despliega                  | están todos, y se pueden cambiar
   */
  const abreElFormulario = async () => {
    pinta();
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    return screen.findByTestId('campo-nombre');
  };

  it('7: al abrir, los opcionales no están a la vista', async () => {
    await abreElFormulario();

    expect(screen.getByTestId('campo-nombre')).toBeInTheDocument();
    expect(screen.queryByTestId('campo-equipo-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campo-handicap')).not.toBeInTheDocument();
  });

  it('8: pero se dice qué se acepta si no se tocan', async () => {
    await abreElFormulario();

    expect(screen.getByTestId('mas-opciones')).toBeInTheDocument();
    expect(screen.getByTestId('resumen-opciones')).toBeInTheDocument();
  });

  it('9: y al desplegarlas, ahí están', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('mas-opciones'));

    // El nombre por defecto sale del idioma de la app: este doble de `t`
    // devuelve la clave y su respaldo juntos
    expect(await screen.findByTestId('campo-equipo-1')).toHaveValue(
      'create.defaultTeamOne Europe'
    );
    expect(screen.getByTestId('campo-jugadores')).toBeInTheDocument();
  });

  it('10: con las opciones plegadas SIGUE habiendo botón de crear (`/code-review`)', async () => {
    // El plegable se tragó el botón de envío: plegado —que es como nace— el
    // formulario no tenía ningún `submit`, así que no se podía crear la
    // competición sin desplegar «Más opciones» primero. Lo contrario de la issue
    await abreElFormulario();

    const enviar = document.querySelectorAll('button[type="submit"]');
    expect(enviar.length).toBeGreaterThan(0);
  });

  it('11: y el resumen dice lo que de verdad se va a enviar', async () => {
    // Estaba escrito a pelo: «equipos a mano · sin límite de hándicap» aunque el
    // organizador hubiera puesto asignación automática y límite 24
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-equipo-1'), { target: { value: 'Los Pinos' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));

    expect(screen.getByTestId('resumen-opciones').textContent).toContain('Los Pinos');
  });

  it('12: el reparto de equipos ya no se decide aquí: lo decide el modo', async () => {
    // Antes esto preguntaba «automático o a mano» dentro del plegable, y podía
    // contradecir al modo (FE #695). El modo está arriba, a la vista
    await abreElFormulario();

    expect(screen.getByTestId('resumen-opciones').textContent).not.toContain('create.summaryAutomatic');
    expect(screen.getByTestId('modo-RYDER_CUP')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('mas-opciones'));

    expect(screen.queryByText('create.teamAssignment')).not.toBeInTheDocument();
  });

  it('13: y el resumen dice si hay tope de hándicap o no', async () => {
    await abreElFormulario();
    expect(screen.getByTestId('resumen-opciones').textContent).toContain('create.summaryNoHandicapLimit');

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(screen.getByTestId('campo-handicap'), { target: { value: '24' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));

    const resumen = screen.getByTestId('resumen-opciones').textContent;
    expect(resumen).toContain('create.summaryHandicapLimit');
    expect(resumen).toContain('24');
  });

  it('14: si lo que falla está plegado, se despliega solo (`/code-review`)', async () => {
    // Vaciar el nombre de un equipo deja el formulario inválido, y el aviso
    // hablaba de un campo que no estaba en pantalla: el organizador pulsaba
    // «Crear» una y otra vez sin ver nunca qué le pedían
    const nombre = await abreElFormulario();
    fireEvent.change(nombre, { target: { value: 'Ryder de los amigos' } });

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-equipo-1'), { target: { value: '  ' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));
    expect(screen.queryByTestId('campo-equipo-1')).not.toBeInTheDocument();

    fireEvent.click(document.querySelector('button[type="submit"]'));

    expect(await screen.findByTestId('campo-equipo-1')).toBeInTheDocument();
  });

  it('15: y el resumen no se inventa un equipo que el organizador ha borrado', async () => {
    // Decía «Europe y USA» con el campo vacío: el resumen prometía lo que el
    // formulario iba a rechazar
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-equipo-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));

    const resumen = screen.getByTestId('resumen-opciones').textContent;
    expect(resumen).not.toContain('Europe');
    expect(resumen).toContain('create.moreOptionsIncomplete');
  });

  /**
   * LA TABLA de la segunda vuelta (Agustín, 19 sep): el cupo y el modo de juego
   * suben al formulario inicial. Eran las dos decisiones que el organizador SÍ
   * toma —cuántos somos y si se juega con hándicap— y estaban escondidas.
   *
   *   #   caso                            | qué pasa
   *   ----|----------------------------------|-----------------------------
   *   16  se abre el formulario            | el cupo a la vista, con 12
   *   17  ídem                             | el modo a la vista, Hándicap
   *   18  se despliega «Más opciones»      | ya no traen ni cupo ni modo
   *   19  el resumen plegado               | no habla del cupo: está arriba
   *   20  un equipo de 2 letras            | lo para el formulario, no un 422
   *   21  editando, se vacía el cupo       | conserva el cargado, no cae a 12
   */
  it('16: el número de jugadores se ve de entrada, y trae los 12 puestos', async () => {
    await abreElFormulario();

    expect(screen.getByTestId('campo-jugadores')).toHaveValue(12);
  });

  it('17: y el modo de juego también, con hándicap marcado', async () => {
    await abreElFormulario();

    expect(screen.getByText('create.handicap')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('create.scratch')).toHaveAttribute('aria-pressed', 'false');
  });

  it('18: lo que queda plegado son los equipos y el tope de hándicap', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('mas-opciones'));

    expect(await screen.findByTestId('campo-equipo-1')).toBeInTheDocument();
    expect(screen.getByTestId('campo-handicap')).toBeInTheDocument();
    // Y estos NO están ahí dentro: viven arriba, uno solo de cada
    expect(screen.getAllByTestId('campo-jugadores')).toHaveLength(1);
    expect(screen.getAllByText('create.handicap')).toHaveLength(1);
  });

  it('19: el resumen ya no promete un cupo que está a la vista', async () => {
    await abreElFormulario();

    expect(screen.getByTestId('resumen-opciones').textContent).not.toContain('12');
  });

  it('23: un equipo demasiado corto también despliega el panel (el gemelo)', async () => {
    const nombre = await abreElFormulario();
    fireEvent.change(nombre, { target: { value: 'Ryder de los amigos' } });

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-equipo-1'), { target: { value: 'EU' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.click(document.querySelector('button[type="submit"]'));

    expect(await screen.findByTestId('campo-equipo-1')).toBeInTheDocument();
  });

  it('24: y un tope de hándicap imposible, igual', async () => {
    const nombre = await abreElFormulario();
    fireEvent.change(nombre, { target: { value: 'Ryder de los amigos' } });

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-handicap'), { target: { value: '99' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.click(document.querySelector('button[type="submit"]'));

    expect(await screen.findByTestId('campo-handicap')).toBeInTheDocument();
  });

  it('25: el resumen no promete unos equipos que el envío va a rechazar', async () => {
    await abreElFormulario();

    fireEvent.click(screen.getByTestId('mas-opciones'));
    fireEvent.change(await screen.findByTestId('campo-equipo-1'), { target: { value: 'EU' } });
    fireEvent.click(screen.getByTestId('mas-opciones'));

    expect(screen.getByTestId('resumen-opciones').textContent).toContain('create.moreOptionsIncomplete');
  });

  /**
   * LA TABLA del recorte (Agustín, 19 sep: «no me gusta que haya tanto scroll»).
   * Medido a 360 px: 1688 px de documento para una ventana de 693 — 2,4
   * pantallas, y ~570 px eran marco: cada tarjeta pagaba un icono de 40 px con
   * su título para envolver uno o dos campos.
   *
   *   #   caso                            | qué pasa
   *   ----|----------------------------------|----------------------------
   *   26  nombre, fechas y país            | una sola tarjeta, una cabecera
   *   27  en el móvil                      | un solo título de pantalla
   */
  it('26: lo básico va junto: una tarjeta, no tres', async () => {
    await abreElFormulario();

    const basico = screen.getByTestId('bloque-basico');
    expect(basico).toContainElement(screen.getByTestId('campo-nombre'));
    expect(basico).toContainElement(screen.getByLabelText(/startDate/));
    expect(basico).toContainElement(screen.getByLabelText(/endDate/));
    // Y ya no hay tres cabeceras para cuatro campos: el país entró aquí con
    // ellos (el selector va mockeado, así que lo que se mira es su cabecera)
    expect(screen.queryByText('create.schedule')).not.toBeInTheDocument();
    expect(screen.queryByText('create.location')).not.toBeInTheDocument();
  });

  it('27: en el móvil no se pintan dos títulos de la misma pantalla', async () => {
    // La cabecera contextual ya pone el suyo; el del formulario lo repetía y se
    // comía 70 px de la primera pantalla. Además son dos `h1` para un lector
    // de pantalla (convención del CLAUDE.md)
    await abreElFormulario();

    const titulo = screen.getByTestId('titulo-pantalla');
    expect(titulo.className).toMatch(/hidden/);
    expect(titulo.className).toMatch(/md:block/);
  });

  it('28: vaciar el cupo y salir del campo enseña lo que se va a enviar', async () => {
    // Se convertía en 12 en silencio: quien lo vacía pensando «sin límite» crea
    // una competición de 12 y se entera cuando el amigo 13 no puede entrar
    await abreElFormulario();

    const jugadores = screen.getByTestId('campo-jugadores');
    fireEvent.change(jugadores, { target: { value: '' } });
    fireEvent.blur(jugadores);

    expect(jugadores).toHaveValue(12);
  });

  it('29: cuando algo falla, el aviso se trae a la vista', async () => {
    // El aviso se pinta arriba del todo y el botón está abajo: en un teléfono
    // se pulsa «Crear», no pasa nada visible y no hay forma de saber por qué
    const traerALaVista = vi.fn();
    globalThis.Element.prototype.scrollIntoView = traerALaVista;

    await abreElFormulario();
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await vi.waitFor(() => expect(traerALaVista).toHaveBeenCalled());
  });

  it('30: las fechas solo van en dos columnas donde caben', async () => {
    // A 360 px cada columna se queda en ~142 px, y un campo de fecha nativo
    // pinta «dd/mm/aaaa» más el icono del calendario: no cabe. Medido a 500 px,
    // que es lo más estrecho que da este Chrome, así que aquí se mira la regla
    await abreElFormulario();

    const fila = screen.getByTestId('fila-fechas');
    expect(fila.className).toContain('grid-cols-1');
    expect(fila.className).toMatch(/min-\[\d+px\]:grid-cols-2/);
  });

  it('21: editando, vaciar el cupo conserva el que había', async () => {
    // Caía al 12 del front: una competición de 24 pasaba a 12 sin decir nada, y
    // con 13 inscritos aprobados eso es una competición llena de golpe
    const { getCompetitionDetailUseCase, updateCompetitionUseCase, fetchCountriesUseCase } = await import('../composition');
    // La carga de la competición no arranca hasta que hay países, y el filtro
    // de `fetchCountries` exige `name_en`/`name_es`
    fetchCountriesUseCase.execute.mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]);
    const { getCompetitionGolfCoursesUseCase } = await import('../composition');
    getCompetitionGolfCoursesUseCase.execute.mockResolvedValue([
      { golf_course: { id: 'g-1', name: 'La Resina', country_code: 'ES', approval_status: 'APPROVED' } },
    ]);
    getCompetitionDetailUseCase.execute.mockResolvedValue({
      id: 'c-1', name: 'Ryder vieja', maxPlayers: 24,
      team1Name: 'Europa', team2Name: 'USA',
      startDate: '2026-10-10', endDate: '2026-10-12',
      playMode: 'HANDICAP', teamAssignment: 'AUTOMATIC', countries: [{ code: 'ES' }],
    });

    pintaEdicion();

    const jugadores = await screen.findByTestId('campo-jugadores');
    // La carga es asíncrona: el campo aparece con el valor de creación y el de
    // la competición llega después
    await vi.waitFor(() => expect(jugadores).toHaveValue(24));

    fireEvent.change(jugadores, { target: { value: '' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await vi.waitFor(() => expect(updateCompetitionUseCase.execute).toHaveBeenCalled());
    const [, enviado] = updateCompetitionUseCase.execute.mock.calls[0];
    expect(enviado.number_of_players ?? enviado.max_players).toBe(24);
  });
});
