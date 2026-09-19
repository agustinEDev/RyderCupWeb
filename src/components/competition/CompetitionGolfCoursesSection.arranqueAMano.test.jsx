import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * LA TABLA de la FE #630 en la pantalla: el aviso es del CAMPO, no de la
 * competición, porque una competición puede mezclar campos con zona y sin ella.
 * Y si todos la tienen, no se dice nada — un cartel de «todo bien» es ruido que
 * se acaba ignorando justo el día que importa.
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

const competicion = { id: 'c-1', countries: [{ code: 'ES' }] };

const conCampos = (...campos) => {
  mockCampos.mockResolvedValue(
    campos.map((golf_course, i) => ({
      golf_course_id: golf_course.id,
      display_order: i + 1,
      created_at: '2026-09-18T10:00:00Z',
      golf_course,
    }))
  );
};

const campo = (id, name, extra = {}) => ({
  id,
  name,
  country_code: 'ES',
  course_type: 'STANDARD_18',
  total_par: 72,
  approval_status: 'APPROVED',
  tees: [],
  holes: [],
  ...extra,
});

const avisoDe = (id) => `arranque-a-mano-${id}`;

describe('CompetitionGolfCoursesSection · qué campos hay que arrancar a mano', () => {
  beforeEach(() => {
    mockCampos.mockReset();
  });

  it('1: con todos los campos con zona, no se dice nada', async () => {
    conCampos(campo('1', 'Miño Artabro', { timezone: 'Europe/Madrid' }));

    render(<CompetitionGolfCoursesSection competition={competicion} canManage={false} />);

    expect((await screen.findAllByText('Miño Artabro')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('1'))).toHaveLength(0);
  });

  it('2: el campo sin zona lleva su aviso', async () => {
    conCampos(
      campo('1', 'Miño Artabro', { timezone: 'Europe/Madrid' }),
      campo('2', 'Pitch Putt Prueba', { timezone: null })
    );

    render(<CompetitionGolfCoursesSection competition={competicion} canManage={false} />);

    expect((await screen.findAllByText('Pitch Putt Prueba')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('2')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('1'))).toHaveLength(0);
  });

  it('3: dos sin zona, dos avisos', async () => {
    conCampos(
      campo('1', 'Uno', { timezone: null }),
      campo('2', 'Otro', { timezone: null })
    );

    render(<CompetitionGolfCoursesSection competition={competicion} canManage={false} />);

    expect((await screen.findAllByText('Uno')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('1')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('2')).length).toBeGreaterThan(0);
  });

  it('4: una competición sin campos no dice nada', async () => {
    conCampos();

    render(<CompetitionGolfCoursesSection competition={competicion} canManage={false} />);

    expect(await screen.findByText('detail.golfCourses.noCourses')).toBeInTheDocument();
    expect(screen.queryAllByTestId(avisoDe('1'))).toHaveLength(0);
  });

  it('5: un campo de una versión anterior, sin el dato, no se avisa', async () => {
    conCampos(campo('1', 'De otra versión'));

    render(<CompetitionGolfCoursesSection competition={competicion} canManage={false} />);

    expect((await screen.findAllByText('De otra versión')).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(avisoDe('1'))).toHaveLength(0);
  });
});
