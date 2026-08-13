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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true },
    loading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockList = vi.fn();
const mockGetById = vi.fn();

vi.mock('../../composition', () => ({
  listGolfCoursesUseCase: { execute: (...args) => mockList(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetById(...args) },
  createGolfCourseAdminUseCase: { execute: vi.fn() },
  updateGolfCourseUseCase: { execute: vi.fn() },
}));

// La tabla real necesita demasiado contexto; aquí solo hace falta poder pulsar
// "editar" sobre un campo concreto
vi.mock('../../components/golf_course/GolfCourseTable', () => ({
  default: ({ courses, onEdit }) => (
    <div>
      {courses.map(course => (
        <button key={course.id} onClick={() => onEdit(course)}>
          editar {course.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../components/golf_course/GolfCourseForm', () => ({
  default: ({ initialData }) => (
    <div data-testid="edit-form">
      hoyos: {(initialData?.holes || []).length}
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
});
