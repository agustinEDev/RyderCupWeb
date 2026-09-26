import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

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
    expect(
      screen.queryAllByRole('button', { name: /detail\.golfCourses\.remove/ })
    ).toHaveLength(0);
    expect(screen.queryByText('detail.golfCourses.dragToReorder')).not.toBeInTheDocument();
  });

  // Ronda 2 de pruebas · el número aparte, y «Añadir Campo» sin partirse a
  // 360 px (salía en dos líneas y el título también)
  it('N3: el número en su pastilla y el botón de añadir en una línea', async () => {
    mockCampos.mockResolvedValue([
      { golf_course_id: 'g-1', display_order: 1, golf_course: { id: 'g-1', name: 'Altea' } },
    ]);
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={true} />);

    const titulo = (await screen.findByText('detail.golfCourses.title')).closest('h3');
    expect(within(titulo).getByTestId('numero-de-la-seccion')).toHaveTextContent('1');
    expect(screen.getByText('detail.golfCourses.addCourse').closest('button')).toHaveClass('whitespace-nowrap');
  });

  // CodeRabbit en la #749, visto a 360 px: con el botón al lado, el título se
  // estrujaba en tres líneas («Campos / de / golf») y «Campos» no cabía en su
  // caja. El título no se parte; si no cabe, el botón baja a su fila
  it('N3b: el título entero en una línea; el botón baja si no cabe', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={true} />);

    const texto = await screen.findByText('detail.golfCourses.title');
    // El título ocupa la fila en el móvil y su número va al borde derecho
    expect(texto.closest('h3')).toHaveClass('w-full');
    expect(texto).toHaveClass('flex-1');
    expect(texto.closest('h3').parentElement).toHaveClass('flex-wrap');
    // En el móvil, de lado a lado y con el texto centrado (Agustín, ronda 2):
    // alineado a la derecha no quedaba bien. Desde tablet, a su tamaño
    const boton = screen.getByText('detail.golfCourses.addCourse').closest('button');
    expect(boton).toHaveClass('w-full', 'justify-center', 'sm:w-auto');
  });

  it('y quien no gestiona no añade nada', async () => {
    render(<CompetitionGolfCoursesSection competition={competicion('ACTIVE')} canManage={false} />);

    await screen.findByText('detail.golfCourses.title');
    expect(screen.queryByText('detail.golfCourses.addCourse')).not.toBeInTheDocument();
  });
});
