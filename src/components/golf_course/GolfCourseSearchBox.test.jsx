// src/components/golf_course/GolfCourseSearchBox.test.jsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GolfCourseSearchBox from './GolfCourseSearchBox';

// Se imita lo que hace i18next de verdad: si hay defaultValue, se usa y se le
// interpolan las variables. Sin eso, un texto con variables no se puede afirmar
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) {
        return Object.entries(fallbackOrOptions).reduce(
          (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
          fallbackOrOptions.defaultValue
        );
      }
      return key;
    },
    i18n: { language: 'es' },
  }),
}));

const mockList = vi.fn();

vi.mock('../../composition', () => ({
  listGolfCoursesUseCase: { execute: (...args) => mockList(...args) },
}));

const course = (id, name) => ({
  id,
  name,
  courseType: 'STANDARD_18',
  tees: [{ color: 'YELLOW' }, { color: 'RED' }],
});

const renderBox = (props = {}) =>
  render(
    <GolfCourseSearchBox
      countryCode="ES"
      selectedCourse={null}
      onCourseSelect={vi.fn()}
      onRequestNewCourse={vi.fn()}
      {...props}
    />
  );

describe('GolfCourseSearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ courses: [course('1', 'Real Club de Golf')], total: 1 });
  });

  it('pide una página al backend, no el catálogo entero', async () => {
    renderBox();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const filters = mockList.mock.calls[0][0];
    expect(filters.countryCode).toBe('ES');
    expect(filters.approvalStatus).toBe('APPROVED');
    // Sin límite se traería los 802 campos federados
    expect(filters.limit).toBeGreaterThan(0);
  });

  it('manda lo escrito al backend en vez de filtrar en el navegador', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prat' } });

    await waitFor(() => {
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.name).toBe('Prat');
    });
  });

  it('no pregunta una vez por tecla', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'R' } });
    fireEvent.change(input, { target: { value: 'Re' } });
    fireEvent.change(input, { target: { value: 'Rea' } });
    fireEvent.change(input, { target: { value: 'Real' } });

    await waitFor(() => {
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.name).toBe('Real');
    });
    // La primera carga más una sola búsqueda: sin la espera serían cinco
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('deja seguir escribiendo mientras la petición está en vuelo', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    // Antes el campo se deshabilitaba al cargar, lo que con una búsqueda por
    // pulsación habría hecho imposible escribir
    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('avisa de que hay más campos de los que se ven', async () => {
    mockList.mockResolvedValue({ courses: [course('1', 'Uno')], total: 69 });
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.focus(screen.getByRole('textbox'));

    expect(await screen.findByText(/Showing 1 of 69/)).toBeInTheDocument();
  });

  it('no avisa cuando se ven todos', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByRole('textbox'));

    await screen.findByText('Real Club de Golf');
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('no pregunta nada sin país', async () => {
    renderBox({ countryCode: '' });

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mockList).not.toHaveBeenCalled();
  });

  it('no pinta los campos del país anterior al cambiar de país', async () => {
    const { rerender } = renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByRole('textbox'));
    await screen.findByText('Real Club de Golf');

    // La respuesta del país nuevo tarda: mientras tanto no puede seguir
    // enseñando los campos españoles bajo la bandera francesa
    mockList.mockReturnValue(new Promise(() => {}));
    rerender(
      <GolfCourseSearchBox
        countryCode="FR"
        selectedCourse={null}
        onCourseSelect={vi.fn()}
        onRequestNewCourse={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Real Club de Golf')).not.toBeInTheDocument();
    });
  });

  it('suelta el campo elegido al teclear, para poder cambiarlo', async () => {
    // Con un campo elegido la casilla mostraba su nombre pase lo que pase: se
    // borraba y el texto seguía entero, sin manera de buscar otro campo
    const onCourseSelect = vi.fn();
    const chosen = course('1', 'Real Club de Golf');
    renderBox({ selectedCourse: chosen, onCourseSelect });

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Real Club de Golf');

    fireEvent.change(input, { target: { value: 'Real Club de Gol' } });

    expect(onCourseSelect).toHaveBeenCalledWith(null);
  });

  it('no avisa de deselección a quien no mantiene ninguna', async () => {
    // Los usos de "añadir campo" pasan selectedCourse={null} y su callback
    // recibe el campo elegido directamente: un null ahí les rompería
    const onCourseSelect = vi.fn();
    renderBox({ onCourseSelect });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rea' } });

    expect(onCourseSelect).not.toHaveBeenCalled();
  });
});
