// src/pages/admin/GolfCourses.test.jsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GolfCourses from './GolfCourses';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es' },
  }),
}));

// El usuario, UNO para toda la prueba: la página carga la lista en un efecto
// que depende de `user`, y un objeto nuevo en cada render la recargaba sin fin.
// Mientras recarga, el modal se desmonta y se vuelve a montar, y con carga un
// Escape caía en ese hueco y se perdía (FE #624)
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true };
  return { useAuth: () => ({ user, loading: false }) };
});

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockList = vi.fn();
const mockGetById = vi.fn();

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
vi.mock('../../composition', () => ({
  listGolfCoursesUseCase: { execute: (...args) => mockList(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetById(...args) },
  createGolfCourseAdminUseCase: { execute: (...args) => mockCreate(...args) },
  updateGolfCourseUseCase: { execute: (...args) => mockUpdate(...args) },
}));

// La tabla real necesita demasiado contexto; aquí solo hace falta poder pulsar
// "editar" sobre un campo concreto
vi.mock('../../components/golf_course/GolfCourseTable', () => ({
  default: ({ courses, onEdit, onView }) => (
    <div>
      {courses.map(course => (
        <div key={course.id}>
          <button onClick={() => onEdit(course)}>editar {course.name}</button>
          <button onClick={() => onView(course)}>ver {course.name}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/golf_course/GolfCourseDetailModal', () => ({
  default: ({ course, onClose }) => (
    <div data-testid="detalle">
      detalle de {course?.name} · hoyos: {(course?.holes || []).length}
      <button onClick={onClose}>cerrar detalle</button>
    </div>
  ),
}));

vi.mock('../../components/golf_course/GolfCourseForm', () => ({
  default: ({ initialData, onSubmit }) => (
    <div data-testid="edit-form">
      hoyos: {(initialData?.holes || []).length}
      <button onClick={() => onSubmit({}).catch(() => {})}>guardar campo</button>
    </div>
  ),
}));

// Tal como llega en el listado: sin tarjeta
const LISTED = {
  id: 'course-1',
  name: 'Real Club de Golf',
  courseType: 'STANDARD_18',
  tees: [{ color: 'YELLOW' }],
  holes: [],
};

// Tal como llega al pedirlo por su id: con sus 18 hoyos
const FULL = {
  ...LISTED,
  holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 })),
};

describe('GolfCourses (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ courses: [LISTED], total: 1 });
    mockGetById.mockResolvedValue(FULL);
  });

  it('pide el campo entero antes de abrir la edición', async () => {
    render(<GolfCourses embedded />);
    const editar = await screen.findByText('editar Real Club de Golf');

    fireEvent.click(editar);

    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('course-1'));
  });

  it('el formulario recibe la tarjeta completa, no la del listado', async () => {
    render(<GolfCourses embedded />);
    fireEvent.click(await screen.findByText('editar Real Club de Golf'));

    // Es lo que evita la pérdida: sin los 18 hoyos, el formulario arranca con
    // los suyos por defecto de par 4 y guardar sobrescribe la tarjeta real
    expect(await screen.findByTestId('edit-form')).toHaveTextContent('hoyos: 18');
  });

  it('no abre la edición si el campo no se puede cargar', async () => {
    mockGetById.mockRejectedValue(new Error('boom'));
    render(<GolfCourses embedded />);

    fireEvent.click(await screen.findByText('editar Real Club de Golf'));

    await waitFor(() => expect(mockGetById).toHaveBeenCalled());
    expect(screen.queryByTestId('edit-form')).not.toBeInTheDocument();
  });

  it('lee los campos de la página que devuelve el listado', async () => {
    render(<GolfCourses embedded />);

    expect(await screen.findByText('editar Real Club de Golf')).toBeInTheDocument();
  });

  describe('detalle del campo', () => {
    it('el ojo abre el detalle en lugar del aviso de «próximamente»', async () => {
      mockGetById.mockResolvedValue(FULL);
      render(<GolfCourses />);

      fireEvent.click(await screen.findByText('ver Real Club de Golf'));

      expect(await screen.findByTestId('detalle')).toHaveTextContent('detalle de Real Club de Golf');
    });

    // El listado no trae la tarjeta, que es justo lo que el detalle enseña
    it('pide el campo entero, no usa el del listado', async () => {
      mockGetById.mockResolvedValue(FULL);
      render(<GolfCourses />);

      fireEvent.click(await screen.findByText('ver Real Club de Golf'));

      await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('course-1'));
      expect(await screen.findByTestId('detalle')).toHaveTextContent('hoyos: 18');
    });

    it('no abre el detalle si el campo no se puede cargar', async () => {
      mockGetById.mockRejectedValue(new Error('boom'));
      render(<GolfCourses />);

      fireEvent.click(await screen.findByText('ver Real Club de Golf'));

      await waitFor(() => expect(mockGetById).toHaveBeenCalled());
      expect(screen.queryByTestId('detalle')).toBeNull();
    });

    it('se cierra', async () => {
      mockGetById.mockResolvedValue(FULL);
      render(<GolfCourses />);

      fireEvent.click(await screen.findByText('ver Real Club de Golf'));
      fireEvent.click(await screen.findByText('cerrar detalle'));

      await waitFor(() => expect(screen.queryByTestId('detalle')).toBeNull());
    });
  });

  // Pasaron a ModalShell el 4 oct 2026: se anuncian con su título, y Escape
  // cierra, que antes no lo hacía
  describe('los modales de crear y editar', () => {
    it('editar se anuncia con su título y se cierra con Escape', async () => {
      render(<GolfCourses embedded />);
      fireEvent.click(await screen.findByText('editar Real Club de Golf'));

      const dialogo = await screen.findByRole('dialog');
      expect(dialogo).toHaveAccessibleName('pages.admin.editCourseTitle');
      // Pulsar fuera no lo cierra, como antes
      const fondo = screen.getByRole('dialog');
      fireEvent.mouseDown(fondo);
      fireEvent.click(fondo);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('crear se anuncia con su título y se cierra con Escape', async () => {
      render(<GolfCourses embedded />);
      fireEvent.click(await screen.findByText('pages.admin.createCourse'));

      const dialogo = await screen.findByRole('dialog');
      expect(dialogo).toHaveAccessibleName('pages.admin.createCourseTitle');
      // Pulsar fuera no lo cierra, como antes
      const fondo = screen.getByRole('dialog');
      fireEvent.mouseDown(fondo);
      fireEvent.click(fondo);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
  });

  // Revisión de la PR de los modales: Escape cerraba el modal con el guardado
  // en vuelo; si fallaba, el error no salía en ningún sitio
  describe('Escape mientras se guarda', () => {
    it.each([
      ['crear', () => fireEvent.click(screen.getByText('pages.admin.createCourse')), mockCreate],
      ['editar', () => fireEvent.click(screen.getByText('editar Real Club de Golf')), mockUpdate],
    ])('%s no se cierra con el guardado en vuelo', async (_, abrir, guardar) => {
      guardar.mockReturnValue(new Promise(() => {}));
      render(<GolfCourses embedded />);
      await screen.findByText('editar Real Club de Golf');
      abrir();
      fireEvent.click(await screen.findByText('guardar campo'));

      await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'));
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it.each([
      ['crear', () => fireEvent.click(screen.getByText('pages.admin.createCourse')), mockCreate],
      ['editar', () => fireEvent.click(screen.getByText('editar Real Club de Golf')), mockUpdate],
    ])('%s se puede cerrar otra vez si el guardado falla', async (_, abrir, guardar) => {
      guardar.mockRejectedValue(new Error('El servidor no quiso'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<GolfCourses embedded />);
      await screen.findByText('editar Real Club de Golf');
      abrir();
      fireEvent.click(await screen.findByText('guardar campo'));

      await waitFor(() => expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-busy'));
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
  });
});

