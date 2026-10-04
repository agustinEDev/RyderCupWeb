import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * El buscador de la ficha solo miraba el país principal: en una competición de
 * Francia con España de adyacente no salía ningún campo español, aunque el
 * servidor los acepta. Desde la #800 los campos solo se ponen desde la ficha,
 * así que no había forma de añadirlos. Decidido por Agustín el 4 oct 2026: un
 * selector de país encima del buscador, que arranca en el principal.
 */
const mockCampos = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...args) => mockCampos(...args) },
  addGolfCourseToCompetitionUseCase: { execute: vi.fn() },
  removeGolfCourseFromCompetitionUseCase: { execute: vi.fn() },
  reorderGolfCoursesUseCase: { execute: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

// El buscador enseña en qué país busca: es lo que se comprueba
vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ countryCode }) => <p data-testid="buscando-en">{countryCode}</p>,
}));
vi.mock('../../services/countries', () => ({ formatCountryName: (pais) => pais.name_es }));
vi.mock('../../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const CompetitionGolfCoursesSection = (await import('./CompetitionGolfCoursesSection')).default;

const ES = { code: 'ES', name_es: 'España' };
const FR = { code: 'FR', name_es: 'Francia' };
const PT = { code: 'PT', name_es: 'Portugal' };

const abrirElBuscador = async (countries) => {
  render(
    <CompetitionGolfCoursesSection
      competition={{ id: 'c-1', status: 'ACTIVE', countries }}
      canManage={true}
    />
  );
  fireEvent.click(await screen.findByText('detail.golfCourses.addCourse'));
};

describe('CompetitionGolfCoursesSection · en qué país se buscan campos', () => {
  beforeEach(() => {
    mockCampos.mockReset().mockResolvedValue([]);
  });

  it('P1: con un solo país no hay nada que elegir', async () => {
    await abrirElBuscador([ES]);

    expect(screen.getByTestId('buscando-en')).toHaveTextContent('ES');
    expect(screen.queryByRole('button', { name: 'España' })).not.toBeInTheDocument();
  });

  it('P2: con adyacente, un botón por país y arranca en el principal', async () => {
    await abrirElBuscador([FR, ES]);

    expect(screen.getByRole('button', { name: 'Francia' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'España' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('buscando-en')).toHaveTextContent('FR');
  });

  it('P3: al elegir el adyacente se busca en él', async () => {
    await abrirElBuscador([FR, ES]);

    fireEvent.click(screen.getByRole('button', { name: 'España' }));

    expect(screen.getByTestId('buscando-en')).toHaveTextContent('ES');
    expect(screen.getByRole('button', { name: 'España' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Francia' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('P4: con dos adyacentes, tres botones', async () => {
    await abrirElBuscador([ES, PT, FR]);

    for (const nombre of ['España', 'Portugal', 'Francia']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });
});
