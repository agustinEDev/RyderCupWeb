import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * La sección de campos avisa a la ficha cuando el servidor confirma un cambio,
 * para que la agenda los vuelva a leer (FE #715). Antes cada una cargaba los
 * suyos y la agenda no veía un campo añadido hasta recargar la página.
 *
 *   #    caso                                 | ¿avisa?
 *   -----|------------------------------------|---------
 *   SC1  añadir, y el servidor lo acepta      | sí, una vez
 *   SC2  añadir, y el servidor lo rechaza     | no
 *   SC3  quitar un campo                      | sí
 *   SC4  reordenar                            | sí: una sesión nueva nace con el primero
 *   SC4b reordenar, y el servidor lo rechaza  | no
 *   SC5  sin nadie a quien avisar             | la sección funciona igual
 */
const mockCampos = vi.fn();
const mockAnadir = vi.fn();
const mockQuitar = vi.fn();
const mockReordenar = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
  addGolfCourseToCompetitionUseCase: { execute: (...a) => mockAnadir(...a) },
  removeGolfCourseFromCompetitionUseCase: { execute: (...a) => mockQuitar(...a) },
  reorderGolfCoursesUseCase: { execute: (...a) => mockReordenar(...a) },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

// El buscador, reducido a un botón que elige un campo
vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <button onClick={() => onCourseSelect({ id: 'g-nuevo', name: 'Meis' })}>elegir-meis</button>
  ),
}));
vi.mock('../../services/countries', () => ({ formatCountryName: () => 'España' }));
vi.mock('../../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// Arrastrar en jsdom no es fiable: se captura el `onDragEnd` que recibe el
// contexto y se llama como lo haría dnd-kit al soltar
let soltar;
vi.mock('@dnd-kit/core', async (original) => ({
  ...(await original()),
  DndContext: ({ onDragEnd, children }) => {
    soltar = onDragEnd;
    return children;
  },
}));

const CompetitionGolfCoursesSection = (await import('./CompetitionGolfCoursesSection')).default;

const competicion = { id: 'c-1', status: 'ACTIVE', countries: [{ code: 'ES' }] };
const fila = (id, name, orden) => ({
  golf_course_id: id,
  display_order: orden,
  golf_course: { id, name },
});

const pintar = (onCamposCambiados) =>
  render(
    <CompetitionGolfCoursesSection
      competition={competicion}
      canManage={true}
      onCamposCambiados={onCamposCambiados}
    />
  );

describe('CompetitionGolfCoursesSection · avisa a la ficha (FE #715)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampos.mockResolvedValue([fila('g-1', 'Altea', 1), fila('g-2', 'Villaitana', 2)]);
    mockAnadir.mockResolvedValue({});
    mockQuitar.mockResolvedValue({});
    mockReordenar.mockResolvedValue({});
  });

  const anadirMeis = async () => {
    fireEvent.click(await screen.findByText('detail.golfCourses.addCourse'));
    fireEvent.click(screen.getByText('elegir-meis'));
  };

  it('SC1: al añadir un campo que el servidor acepta, avisa una vez', async () => {
    const aviso = vi.fn();
    pintar(aviso);

    await anadirMeis();

    await waitFor(() => expect(aviso).toHaveBeenCalledTimes(1));
    expect(mockAnadir).toHaveBeenCalledWith('c-1', 'g-nuevo');
  });

  it('SC2: si el servidor lo rechaza, no avisa', async () => {
    mockAnadir.mockRejectedValue(new Error('no'));
    const aviso = vi.fn();
    pintar(aviso);

    await anadirMeis();

    await waitFor(() => expect(mockAnadir).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(aviso).not.toHaveBeenCalled();
  });

  it('SC3: al quitar un campo, avisa', async () => {
    const aviso = vi.fn();
    pintar(aviso);

    fireEvent.click((await screen.findAllByTitle('detail.golfCourses.remove'))[0]);
    // Se confirma en el modal de la app, no en el diálogo nativo (FE #730)
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(aviso).toHaveBeenCalledTimes(1));
    expect(mockQuitar).toHaveBeenCalledWith('c-1', 'g-1');
  });

  it('SC3b: si se dice que no, no se quita (FE #730)', async () => {
    const nativo = vi.spyOn(window, 'confirm');
    pintar(vi.fn());

    fireEvent.click((await screen.findAllByTitle('detail.golfCourses.remove'))[0]);
    // FE #742 · con sus propias palabras, no «Confirmar» / «Cancelar»
    expect(await screen.findByText('detail.golfCourses.removeDialog.title')).toBeInTheDocument();
    expect(screen.getByText('detail.golfCourses.removeDialog.body')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'detail.golfCourses.removeDialog.confirm' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'detail.golfCourses.removeDialog.keep' }));

    await waitFor(() =>
      expect(screen.queryByText('detail.golfCourses.removeDialog.title')).not.toBeInTheDocument()
    );
    expect(mockQuitar).not.toHaveBeenCalled();
    expect(nativo).not.toHaveBeenCalled();
    nativo.mockRestore();
  });

  it('SC4: al reordenar, avisa: una sesión nueva nace con el primer campo', async () => {
    const aviso = vi.fn();
    pintar(aviso);
    await screen.findAllByText('Villaitana');

    await act(async () => soltar({ active: { id: 'g-2' }, over: { id: 'g-1' } }));

    expect(mockReordenar).toHaveBeenCalledWith('c-1', ['g-2', 'g-1']);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('SC4b: si el servidor rechaza el orden, no avisa', async () => {
    mockReordenar.mockRejectedValue(new Error('no'));
    const aviso = vi.fn();
    pintar(aviso);
    await screen.findAllByText('Villaitana');

    await act(async () => soltar({ active: { id: 'g-2' }, over: { id: 'g-1' } }));

    expect(aviso).not.toHaveBeenCalled();
  });

  it('SC5: sin nadie a quien avisar, añadir funciona igual', async () => {
    pintar(undefined);

    await anadirMeis();

    await waitFor(() => expect(mockAnadir).toHaveBeenCalled());
    await waitFor(() => expect(mockCampos).toHaveBeenCalledTimes(2));
  });
});
