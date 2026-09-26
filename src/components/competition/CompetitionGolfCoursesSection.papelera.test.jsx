import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * FE #743 · la papelera de cada campo, en el idioma de la app y con nombre.
 *
 * Visto en el Kind el 26 sep: el botón no tenía etiqueta accesible y su texto
 * de ayuda era «Remove golf course», en inglés. Con varios campos, un lector
 * de pantalla leía varias papeleras iguales sin decir de cuál.
 */
const mockCampos = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...args) => mockCampos(...args) },
  addGolfCourseToCompetitionUseCase: { execute: vi.fn() },
  removeGolfCourseFromCompetitionUseCase: { execute: vi.fn() },
  reorderGolfCoursesUseCase: { execute: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, opciones) => (opciones?.name ? `${clave}:${opciones.name}` : clave),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
vi.mock('../../services/countries', () => ({ formatCountryName: () => 'España' }));
vi.mock('../../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const CompetitionGolfCoursesSection = (await import('./CompetitionGolfCoursesSection')).default;

const abierta = { id: 'c-1', status: 'ACTIVE', countries: [{ code: 'ES' }] };

describe('CompetitionGolfCoursesSection · la papelera de cada campo (#743)', () => {
  beforeEach(() => {
    mockCampos.mockReset().mockResolvedValue([
      { golf_course_id: 'g-1', display_order: 1, golf_course: { id: 'g-1', name: 'Altea' } },
      { golf_course_id: 'g-2', display_order: 2, golf_course: { id: 'g-2', name: 'Villaitana' } },
    ]);
  });

  it('G1: cada papelera dice qué campo quita', async () => {
    render(<CompetitionGolfCoursesSection competition={abierta} canManage={true} />);

    await screen.findAllByText('Altea');
    // Móvil y escritorio pintan cada uno su fila: al menos una por campo
    expect(
      screen.getAllByRole('button', { name: 'detail.golfCourses.remove:Altea' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'detail.golfCourses.remove:Villaitana' }).length
    ).toBeGreaterThan(0);
  });

  it('G2: ningún texto de ayuda en inglés', async () => {
    render(<CompetitionGolfCoursesSection competition={abierta} canManage={true} />);

    await screen.findAllByText('Altea');
    expect(screen.queryAllByTitle('Remove golf course')).toHaveLength(0);
  });

  it('G3: un campo sin nombre se pinta traducido, no «Golf Course»', async () => {
    mockCampos.mockResolvedValue([
      { golf_course_id: 'g-3', display_order: 1, golf_course: { id: 'g-3', name: '' } },
    ]);
    render(<CompetitionGolfCoursesSection competition={abierta} canManage={true} />);

    expect((await screen.findAllByText('detail.golfCourses.unnamed')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Golf Course')).not.toBeInTheDocument();
  });
});
