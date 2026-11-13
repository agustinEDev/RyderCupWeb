import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

/**
 * Dos altas seguidas (T3-16b): la relectura de la segunda descarta la de la
 * primera. La primera no avisa a la ficha (ni suelta su campo en vuelo) hasta
 * que llega la lista más reciente, pedida ya con ella dada de alta. Que el
 * campo siga en vuelo no se ve: mientras se relee, la sección enseña la espera
 */ const mockCampos = vi.fn();
const mockAnadir = vi.fn();
const mockQuitar = vi.fn();
const mockReordenar = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
  addGolfCourseToCompetitionUseCase: { execute: (...a) => mockAnadir(...a) },
  removeGolfCourseFromCompetitionUseCase: {
    execute: (...a) => mockQuitar(...a),
  },
  reorderGolfCoursesUseCase: { execute: (...a) => mockReordenar(...a) },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

// El buscador, reducido a un botón que elige un campo
vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <>
      <button onClick={() => onCourseSelect({ id: 'g-a', name: 'Meis' })}>
        elegir-meis
      </button>
      <button onClick={() => onCourseSelect({ id: 'g-b', name: 'Lauro' })}>
        elegir-lauro
      </button>
    </>
  ),
}));
vi.mock('../../services/countries', () => ({
  formatCountryName: () => 'España',
}));
vi.mock('../ui/CountryFlag', () => ({ CountryFlag: () => null }));
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const CompetitionGolfCoursesSection = (
  await import('./CompetitionGolfCoursesSection')
).default;

const competicion = {
  id: 'c-1',
  status: 'ACTIVE',
  countries: [{ code: 'ES' }],
};
const fila = (id, name, orden) => ({
  golf_course_id: id,
  display_order: orden,
  golf_course: { id, name },
});

describe('CompetitionGolfCoursesSection · dos altas seguidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T3-16b: la primera alta avisa solo cuando llega una lista que la incluye', async () => {
    const altas = {};
    mockAnadir.mockImplementation(
      (_, id) =>
        new Promise((r) => {
          altas[id] = r;
        }),
    );
    const relecturas = [];
    mockCampos
      .mockResolvedValueOnce([fila('g-1', 'Altea', 1)])
      .mockImplementation(() => new Promise((r) => relecturas.push(r)));
    const aviso = vi.fn();
    render(
      <CompetitionGolfCoursesSection
        competition={competicion}
        canManage={true}
        onCamposCambiados={aviso}
      />,
    );

    fireEvent.click(await screen.findByText('detail.golfCourses.addCourse'));
    fireEvent.click(screen.getByText('elegir-meis'));
    fireEvent.click(screen.getByText('elegir-lauro'));
    await act(async () => {
      altas['g-a']({});
    });
    await waitFor(() => expect(relecturas).toHaveLength(1));
    await act(async () => {
      altas['g-b']({});
    });
    await waitFor(() => expect(relecturas).toHaveLength(2));
    await act(async () => {});

    // La relectura de Meis quedó descartada, pero aún no ha llegado ninguna lista con Meis
    expect(aviso).not.toHaveBeenCalled();

    await act(async () => {
      relecturas[1]([
        fila('g-1', 'Altea', 1),
        fila('g-a', 'Meis', 2),
        fila('g-b', 'Lauro', 3),
      ]);
    });

    await waitFor(() => expect(aviso).toHaveBeenCalledTimes(2));
    expect(await screen.findAllByText('Meis')).not.toHaveLength(0);
  });
});
