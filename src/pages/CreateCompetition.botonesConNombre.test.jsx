import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Los botones que solo llevan un icono también se nombran. La X de quitar un
 * país adyacente y la papelera de quitar un campo no tenían nombre: un lector de
 * pantalla decía solo «botón». Visto en la prueba en bloque del 4 oct 2026.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) => (valores ? `${clave} ${Object.values(valores).join(' ')}` : clave),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1', gender: 'MALE' }, loading: false }) }));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../services/countries', () => ({
  formatCountryName: (pais) => pais?.name_es || pais?.code || '',
  sortCountriesByName: (paises) => paises || [],
}));
vi.mock('../composition', () => ({
  createCompetitionWithGolfCoursesUseCase: { execute: vi.fn() },
  updateCompetitionUseCase: { execute: vi.fn() },
  getCompetitionDetailUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([{ code: 'ES', name_es: 'España', name_en: 'Spain' }]) },
  // Para cualquier país, Portugal y Francia: lo justo para poder añadir dos adyacentes
  getAdjacentCountriesUseCase: {
    execute: vi.fn().mockResolvedValue([
      { code: 'PT', name_es: 'Portugal', name_en: 'Portugal' },
      { code: 'FR', name_es: 'Francia', name_en: 'France' },
    ]),
  },
  createGolfCourseRequestUseCase: { execute: vi.fn() },
}));
// Elegir país y campo con un botón: lo que se mira es el botón de quitarlo
vi.mock('../components/ui/CountryAutocomplete', () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange('ES')}>elegir España</button>
  ),
}));
vi.mock('../components/golf_course/GolfCourseSearchBox', () => ({
  default: ({ countryCode, onCourseSelect }) => (
    <button type="button" onClick={() => onCourseSelect({ id: `g-${countryCode}`, name: `Campo ${countryCode}` })}>
      {`elegir campo ${countryCode}`}
    </button>
  ),
}));
vi.mock('../components/golf_course/GolfCourseRequestModal', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));

import competicionesEs from '../i18n/locales/es/competitions.json';
import competicionesEn from '../i18n/locales/en/competitions.json';

const CreateCompetition = (await import('./CreateCompetition')).default;
const { getCompetitionDetailUseCase } = await import('../composition');

// Un botón sin texto ni `aria-label` no tiene nombre que leer
const sinNombre = () =>
  screen
    .getAllByRole('button')
    .filter((boton) => !boton.textContent.trim() && !boton.getAttribute('aria-label'));

describe('CreateCompetition · los botones de icono se nombran', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getCompetitionDetailUseCase.execute.mockResolvedValue({
      id: 'c-1',
      name: 'Medal de tres países',
      startDate: '2030-06-01',
      endDate: '2030-06-03',
      countries: [{ code: 'ES', isMain: true }, { code: 'PT' }, { code: 'FR' }],
      maxPlayers: 12,
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      hasTeams: false,
      tournamentType: 'MEDAL',
      creatorId: 'u-1',
    });
  });

  it('B1: al editar, la X de cada país adyacente dice cuál quita', async () => {
    render(
      <MemoryRouter initialEntries={['/competitions/c-1/edit']}>
        <Routes>
          <Route path="/competitions/:id/edit" element={<CreateCompetition />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('Medal de tres países');

    expect(
      screen.getByRole('button', { name: 'create.removeCountryField create.adjacentCountry' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'create.removeCountryField create.thirdCountry' })
    ).toBeInTheDocument();
    expect(sinNombre()).toEqual([]);
  });

  it('B2: al crear, la papelera de un campo dice cuál quita', async () => {
    render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-MANUAL'));
    fireEvent.click(await screen.findByRole('button', { name: 'elegir España' }));
    fireEvent.click(await screen.findByRole('button', { name: 'elegir campo ES' }));

    expect(
      await screen.findByRole('button', { name: 'detail.golfCourses.remove Campo ES' })
    ).toBeInTheDocument();
    expect(sinNombre()).toEqual([]);
  });

  it('B3: también la de los campos de cada país adyacente', async () => {
    render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-MANUAL'));
    fireEvent.click(await screen.findByRole('button', { name: 'elegir España' }));
    fireEvent.click(await screen.findByText('create.addAdjacentCountry'));
    fireEvent.change(await screen.findByLabelText('create.adjacentCountry'), {
      target: { name: 'adjacentCountry1', value: 'PT' },
    });
    fireEvent.click(await screen.findByText('create.addThirdCountry'));
    fireEvent.change(await screen.findByLabelText('create.thirdCountry'), {
      target: { name: 'adjacentCountry2', value: 'FR' },
    });
    for (const pais of ['ES', 'PT', 'FR']) {
      fireEvent.click(await screen.findByRole('button', { name: `elegir campo ${pais}` }));
    }

    for (const pais of ['ES', 'PT', 'FR']) {
      expect(
        await screen.findByRole('button', { name: `detail.golfCourses.remove Campo ${pais}` })
      ).toBeInTheDocument();
    }
    expect(sinNombre()).toEqual([]);
    // El contador de cada bloque, también los de los adyacentes, lleva su número
    expect(screen.getAllByText('(create.coursesSelected 1)')).toHaveLength(3);
  });

  // «(1 campos seleccionados)»: el número iba suelto delante del texto y el
  // plural no se elegía. Visto en la prueba en bloque del 4 oct 2026
  it('P1: el número de campos de cada país elige singular o plural', async () => {
    render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
    fireEvent.click(await screen.findByTestId('modo-MANUAL'));
    fireEvent.click(await screen.findByRole('button', { name: 'elegir España' }));

    expect(await screen.findByText('(create.coursesSelected 0)')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'elegir campo ES' }));
    expect(await screen.findByText('(create.coursesSelected 1)')).toBeInTheDocument();
  });

  it.each([
    ['es', competicionesEs, '{{count}} campo seleccionado', '{{count}} campos seleccionados'],
    ['en', competicionesEn, '{{count}} course selected', '{{count}} courses selected'],
  ])('P2: en %s hay singular y plural', (_, textos, uno, varios) => {
    expect(textos.create.coursesSelected_one).toBe(uno);
    expect(textos.create.coursesSelected_other).toBe(varios);
  });
});
