import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * LA TABLA de la FE #648: los campos de fecha caben dentro de su tarjeta.
 *
 * Medido en un iPhone 14 de verdad: con el mismo `w-full`, el campo de texto
 * medía 292 px y el de fecha 318. Safari en iOS dibuja `input[type="date"]` como
 * un control nativo que IMPONE su ancho, y ni `w-full` ni `min-w-0` ni
 * `max-w-full` lo mueven. Quitarle la apariencia nativa sí: vuelve a 292.
 *
 * Esto no se puede probar midiendo en un navegador: ningun motor de escritorio
 * lo reproduce, ni WebKit. Lo que se fija aqui es que las clases que lo arreglan
 * siguen puestas, para que nadie las quite sin saber lo que costo encontrarlas.
 *
 *   #   caso                                 | que tiene que pasar
 *   ----|-----------------------------------------|----------------------------
 *   1   los campos de fecha                   | sin apariencia nativa
 *   2   los campos de fecha                   | no imponen ancho al contenedor
 *   3   sus huecos del grid                   | pueden encoger (`min-w-0`)
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores && typeof valores === 'object' ? `${clave} ${Object.values(valores).join(' ')}` : clave,
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
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
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  getAdjacentCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

const CreateCompetition = (await import('./CreateCompetition')).default;

const abreElFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  // Y el modo de configuración, que es el paso siguiente (FE #695). Estilo
  // RyderCup es lo que estas pantallas daban por hecho
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  await screen.findByText('create.competitionDetails');
};

describe('CreateCompetition · los campos de fecha caben (FE #648)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('1: los campos de fecha no llevan la apariencia nativa', async () => {
    // Es lo unico que libera el ancho del control de fecha en Safari de iOS
    await abreElFormulario();

    for (const id of ['startDate', 'endDate']) {
      expect(document.querySelector(`#${id}`).className).toContain('appearance-none');
    }
  });

  it('2: los campos de fecha no pueden imponer su ancho', async () => {
    await abreElFormulario();

    for (const id of ['startDate', 'endDate']) {
      const clases = document.querySelector(`#${id}`).className;
      expect(clases).toContain('w-full');
      expect(clases).toContain('min-w-0');
      expect(clases).toContain('max-w-full');
    }
  });

  it('3: sus huecos del grid pueden encoger', async () => {
    // Un item de grid no baja de su contenido salvo que se le diga
    await abreElFormulario();

    const fila = screen.getByTestId('fila-fechas');
    for (const hueco of fila.children) {
      expect(hueco.className).toContain('min-w-0');
    }
  });
});
