import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El cupo de inscritos admite hasta 200 (BE #314): la API lo subió al leer las
 * inscripciones sin límite oculto, y el campo no puede quedarse en 100.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) =>
      valores ? `${clave} ${Object.values(valores).join(' ')}` : clave,
    i18n: { language: 'es' },
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
// El mismo `user` en cada render: uno nuevo cada vez relanza los efectos que
// dependen de él y vuelve el test intermitente
const USUARIO = { user: { id: 'u-1', gender: 'MALE' }, loading: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => USUARIO }));
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

// Pasarse del tope sin rellenar lo demás: la validación de verdad se para en el
// nombre. Que devuelva `max: 200` lo prueba su propio test; aquí, que se pinte
const mockValidar = vi.fn(() => null);
vi.mock('../utils/competitionFormValidation', () => ({
  validateCompetitionForm: (...a) => mockValidar(...a),
}));

const CreateCompetition = (await import('./CreateCompetition')).default;

const alFormulario = async () => {
  render(<MemoryRouter><CreateCompetition /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId('tipo-RYDER_CUP'));
  fireEvent.click(await screen.findByTestId('modo-RYDER_CUP'));
  fireEvent.click(await screen.findByTestId('mas-opciones'));
  return screen.findByTestId('campo-jugadores');
};

describe('CreateCompetition · cupo de inscritos (BE #314)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('el campo deja llegar a 200', async () => {
    expect(await alFormulario()).toHaveAttribute('max', '200');
  });

  it('pasarse lo dice con el tope, no con «{{max}}»', async () => {
    mockValidar.mockReturnValue({ key: 'playersMaximum', max: 200 });
    const campo = await alFormulario();
    fireEvent.submit(campo.closest('form'));

    expect(await screen.findByText(/create\.errors\.playersMaximum.*200/)).toBeInTheDocument();
  });
});
