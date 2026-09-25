import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Los nombres de los equipos cuando el idioma llega TARDE.
 *
 * Los namespaces se cargan sin suspense: la primera pintada puede salir con el
 * respaldo en inglés, y el formulario corrige los nombres cuando el idioma
 * acaba de cargar. Solo los que siguen siendo de la app, y nunca al editar.
 *
 *   #   caso                                               | qué pasa
 *   ----|--------------------------------------------------|---------------------------
 *   I1  crear; se escribe el equipo 2 y llega el español   | el 1 pasa a «Europa»
 *   I2  crear; se escribe el equipo 1 y llega el español   | el 2 pasa a «Estados Unidos»
 *   I3  editar una guardada con «Europe»/«USA»; llega el es | siguen «Europe»/«USA»
 *   I4  crear en es; se escribe «USA» a mano en el 1; en   | sigue «USA»
 *   I5  crear en en; se escribe «Europe» a mano en el 2; es | sigue «Europe»
 *
 * I4 e I5 son de la revisión de la FE #707: se decidía por el TEXTO, así que
 * un nombre escrito a mano que coincidiera con uno de la app se tomaba por no
 * tocado, y además por el de cualquiera de los dos equipos.
 */

const TEXTOS = {
  en: { 'create.defaultTeamOne': 'Europe', 'create.defaultTeamTwo': 'USA' },
  es: { 'create.defaultTeamOne': 'Europa', 'create.defaultTeamTwo': 'Estados Unidos' },
};
// Un `t` ESTABLE por idioma, como el de verdad: si cambiara en cada pintada,
// el efecto que corrige los nombres se volvería a disparar siempre
const T = Object.fromEntries(
  Object.entries(TEXTOS).map(([idioma, textos]) => [
    idioma,
    (clave, valores) => textos[clave] ?? valores?.defaultValue ?? clave,
  ])
);
let mockIdioma = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: T[mockIdioma], i18n: { language: mockIdioma } }),
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
  fetchCountriesUseCase: {
    execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]),
  },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));

vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

const alta = () => (
  <MemoryRouter>
    <CreateCompetition />
  </MemoryRouter>
);
const edicion = () => (
  <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
    <Routes>
      <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
    </Routes>
  </MemoryRouter>
);

const despliegaLosEquipos = async () => {
  const mas = screen.queryByTestId('mas-opciones');
  if (mas && !screen.queryByTestId('campo-equipo-1')) fireEvent.click(mas);
  return [await screen.findByTestId('campo-equipo-1'), screen.getByTestId('campo-equipo-2')];
};

// Llega el español: otra pintada, ahora con su `t`
const llegaElEspanol = (rerender, arbol) => {
  mockIdioma = 'es';
  rerender(arbol());
};

describe('CreateCompetition · los nombres de los equipos cuando llega el idioma', () => {
  beforeEach(() => {
    mockIdioma = 'en';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const abreElAlta = async () => {
    const vista = render(alta());
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
    await screen.findByTestId('campo-nombre');
    return vista;
  };

  it('I1: escrito el equipo 2, el 1 sigue siendo de la app y se traduce', async () => {
    const { rerender } = await abreElAlta();
    const [, dos] = await despliegaLosEquipos();
    fireEvent.change(dos, { target: { value: 'Los Pepes' } });

    llegaElEspanol(rerender, alta);

    const [uno, dosAhora] = await despliegaLosEquipos();
    await vi.waitFor(() => expect(uno).toHaveValue('Europa'));
    expect(dosAhora).toHaveValue('Los Pepes');
  });

  it('I2: escrito el equipo 1, el 2 sigue siendo de la app y se traduce', async () => {
    const { rerender } = await abreElAlta();
    const [uno] = await despliegaLosEquipos();
    fireEvent.change(uno, { target: { value: 'Los Pepes' } });

    llegaElEspanol(rerender, alta);

    const [unoAhora, dos] = await despliegaLosEquipos();
    await vi.waitFor(() => expect(dos).toHaveValue('Estados Unidos'));
    expect(unoAhora).toHaveValue('Los Pepes');
  });

  it('I4: un nombre escrito a mano no se cambia aunque coincida con uno de la app', async () => {
    // Llamar «USA» al equipo 1 es una decisión del organizador: ni se traduce
    // ni pasa a «Europe» por ser el primero
    mockIdioma = 'es';
    const { rerender } = await abreElAlta();
    const [uno] = await despliegaLosEquipos();
    fireEvent.change(uno, { target: { value: 'USA' } });

    mockIdioma = 'en';
    rerender(alta());

    const [unoAhora, dos] = await despliegaLosEquipos();
    await vi.waitFor(() => expect(dos).toHaveValue('USA'));
    expect(unoAhora).toHaveValue('USA');
  });

  it('I5: tampoco el que coincide con el respaldo en inglés', async () => {
    const { rerender } = await abreElAlta();
    const [, dos] = await despliegaLosEquipos();
    fireEvent.change(dos, { target: { value: 'Europe' } });

    llegaElEspanol(rerender, alta);

    const [uno, dosAhora] = await despliegaLosEquipos();
    await vi.waitFor(() => expect(uno).toHaveValue('Europa'));
    expect(dosAhora).toHaveValue('Europe');
  });

  it('I3: editando, los nombres guardados no se tocan aunque cambie el idioma', async () => {
    // Una competición en marcha que se creó con la app en inglés: renombrarle
    // los equipos por abrirla en español sería cambiarle los datos
    const { getCompetitionDetailUseCase } = await import('../composition');
    getCompetitionDetailUseCase.execute.mockResolvedValue({
      id: 'c-1', name: 'Ryder vieja', maxPlayers: 24,
      team1Name: 'Europe', team2Name: 'USA',
      startDate: '2026-10-10', endDate: '2026-10-12',
      playMode: 'HANDICAP', teamAssignment: 'AUTOMATIC', countries: [{ code: 'ES' }],
    });
    const { rerender } = render(edicion());
    const [uno] = await despliegaLosEquipos();
    await vi.waitFor(() => expect(uno).toHaveValue('Europe'));

    llegaElEspanol(rerender, edicion);

    const [unoAhora, dos] = await despliegaLosEquipos();
    // Se da tiempo a que el efecto actúe, si fuera a hacerlo
    await new Promise((r) => setTimeout(r, 50));
    expect(unoAhora).toHaveValue('Europe');
    expect(dos).toHaveValue('USA');
  });
});
