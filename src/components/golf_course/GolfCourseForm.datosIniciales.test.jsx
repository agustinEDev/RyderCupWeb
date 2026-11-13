import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GolfCourseForm from './GolfCourseForm';
import GolfCourseRequestModal from './GolfCourseRequestModal';

/**
 * Lo que el formulario toma de `initialData` (lote T3):
 *
 *   #      caso                                                  | qué pasa
 *   -------|-------------------------------------------------------|---------------------------
 *   T3-10  pedir un campo con nombre y tipo escritos y el país    | siguen escritos
 *          | ya puesto; el envío falla                             |
 *   T3-11  admin: editar X, cerrar, editar Y                      | se ven los datos de Y
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es' },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...rest }) => {
      void initial;
      void animate;
      void transition;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock('../../composition', () => ({
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const campo = (name, courseType) => ({
  id: name,
  name,
  countryCode: 'ES',
  courseType,
  tees: [
    { color: 'YELLOW', teeGender: 'MALE', courseRating: 70, slopeRating: 120 },
    { color: 'RED', teeGender: 'FEMALE', courseRating: 72, slopeRating: 125 },
  ],
});

const nombre = () => screen.getByPlaceholderText('form.namePlaceholder');

describe('GolfCourseForm · lo que toma de initialData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('T3-10: si falla la petición del campo, el nombre y el tipo siguen escritos', async () => {
    const crear = { execute: vi.fn().mockRejectedValue(new Error('sin red')) };
    const { container } = render(
      <GolfCourseRequestModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        countryCode="ES"
        createGolfCourseRequestUseCase={crear}
      />
    );

    fireEvent.change(nombre(), { target: { value: 'Golf de Meis' } });
    fireEvent.click(screen.getByRole('button', { name: 'form.courseTypes.EXECUTIVE' }));
    // Un ejecutivo pide par 61-65: siete hoyos de par 3 y el resto de par 4
    screen.getAllByRole('button', { name: '3' }).slice(0, 7).forEach((boton) => fireEvent.click(boton));
    container.querySelectorAll('input[step="0.1"]').forEach((input) => {
      fireEvent.change(input, { target: { value: '60' } });
    });
    container.querySelectorAll('input[type="number"]:not([step])').forEach((input) => {
      fireEvent.change(input, { target: { value: '100' } });
    });
    fireEvent.submit(nombre().closest('form'));

    await waitFor(() => expect(screen.getByText('sin red')).toBeInTheDocument());
    expect(nombre()).toHaveValue('Golf de Meis');
    expect(screen.getByRole('button', { name: 'form.courseTypes.EXECUTIVE' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('T3-11: editar X, cerrar y editar Y enseña los datos de Y', () => {
    const { unmount } = render(
      <GolfCourseForm initialData={campo('Campo X', 'STANDARD_18')} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );
    expect(nombre()).toHaveValue('Campo X');
    unmount();

    render(<GolfCourseForm initialData={campo('Campo Y', 'PITCH_AND_PUTT')} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(nombre()).toHaveValue('Campo Y');
    expect(screen.getByRole('button', { name: 'form.courseTypes.PITCH_AND_PUTT' })).toHaveAttribute('aria-pressed', 'true');
  });
});
