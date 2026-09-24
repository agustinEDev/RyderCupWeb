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

  // FE #713: con la agenda propuesta al crear, toda competición Ryder nace con
  // sesiones; el servidor ya deja añadir campos hasta que se acaba (BE #368)
  it.each(['CLOSED', 'IN_PROGRESS'])('%s: se sigue pudiendo añadir un campo', async (estado) => {
    render(<CompetitionGolfCoursesSection competition={competicion(estado)} canManage={true} />);

    expect(await screen.findByText('detail.golfCourses.addCourse')).toBeInTheDocument();
  });

  it.each(['COMPLETED', 'CANCELLED'])('%s: ya no', async (estado) => {
    render(<CompetitionGolfCoursesSection competition={competicion(estado)} canManage={true} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });

  it('con un estado que no conoce, no ofrece añadir pero la sección se pinta', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion(undefined)} canManage={true} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });

  it('cerradas las inscripciones, quitar y reordenar siguen sin poderse', async () => {
    mockCampos.mockResolvedValue([
      { golf_course_id: 'g-1', display_order: 1, golf_course: { id: 'g-1', name: 'Altea' } },
      { golf_course_id: 'g-2', display_order: 2, golf_course: { id: 'g-2', name: 'Villaitana' } },
    ]);
    render(<CompetitionGolfCoursesSection competition={competicion('CLOSED')} canManage={true} />);

    await screen.findAllByText('Altea');
    expect(screen.queryAllByTitle('Remove golf course')).toHaveLength(0);
    expect(screen.queryByText('detail.golfCourses.dragToReorder')).not.toBeInTheDocument();
  });

  it('y quien no gestiona no añade nada', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={false} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });
});
