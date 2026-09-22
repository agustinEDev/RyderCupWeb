import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * El caso que motivó todo esto: invitas a un amigo antes de haber puesto el
 * campo de golf, eso abre el torneo (BE #319), y entonces hay que poder poner
 * el campo. El servidor ya lo permite con las inscripciones abiertas (BE #323);
 * si la sección lo sigue atando al borrador, no hay camino para arreglarlo.
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

vi.mock('../golf_course/GolfCourseSearchBox', () => ({ default: () => null }));
vi.mock('../../services/countries', () => ({ formatCountryName: () => 'España' }));
vi.mock('../../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const CompetitionGolfCoursesSection = (await import('./CompetitionGolfCoursesSection')).default;

const competicion = (status) => ({ id: 'c-1', status, countries: [{ code: 'ES' }] });

describe('CompetitionGolfCoursesSection · poner el campo después de invitar', () => {
  beforeEach(() => {
    mockCampos.mockReset().mockResolvedValue([]);
  });

  it('con las inscripciones abiertas todavía se puede añadir un campo', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={true} />);

    expect(await screen.findByText('detail.golfCourses.addCourse')).toBeInTheDocument();
  });

  it('en borrador, como siempre', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('DRAFT')} canManage={true} />);

    expect(await screen.findByText('detail.golfCourses.addCourse')).toBeInTheDocument();
  });

  it('cerradas las inscripciones, ya no', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('CLOSED')} canManage={true} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });

  it('y quien no gestiona no añade nada', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={false} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });
});
