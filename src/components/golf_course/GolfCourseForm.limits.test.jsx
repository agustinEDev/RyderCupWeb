import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GolfCourseForm from './GolfCourseForm';
import customToast from '../../utils/toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
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
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

/**
 * El formulario tenia sus propios limites, mas estrechos que los del backend:
 * par por hoyo 3-5 contra 3-6, y de 2 a 10 barras contra 1 a 14. El campo
 * federado de La Marquesa tiene un hoyo par 6, y hay 24 campos con mas de diez
 * barras y dos con una sola que no se podian ni abrir. Ver #583 y #584.
 */
describe('GolfCourseForm · limites alineados con el backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const teeAt = (index) => ({
    color: 'OTHER',
    identifier: `Barra ${index + 1}`,
    teeGender: 'MALE',
    courseRating: 70,
    slopeRating: 120,
  });

  const renderWith = ({ tees = 2, holes = null } = {}) => {
    const onSubmit = vi.fn();
    render(
      <GolfCourseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initialData={{
          name: 'Campo de prueba',
          countryCode: 'ES',
          courseType: 'STANDARD_18',
          tees: Array.from({ length: tees }, (_, i) => teeAt(i)),
          ...(holes ? { holes } : {}),
        }}
      />
    );
    return onSubmit;
  };

  // En jsdom pulsar el boton no dispara el `onSubmit` del form, y la validacion
  // vive ahi.
  const submitForm = () => {
    fireEvent.submit(screen.getByRole('button', { name: 'form.update' }).closest('form'));
  };

  const errores = () => customToast.error.mock.calls.map((c) => String(c[0]));

  describe('par por hoyo', () => {
    it('ofrece el par 6 en los 18 hoyos', () => {
      renderWith();

      expect(screen.getAllByRole('button', { name: '6' })).toHaveLength(18);
    });

    it('deja marcar el par 6 de un hoyo', () => {
      renderWith();

      fireEvent.click(screen.getAllByRole('button', { name: '6' })[0]);

      expect(screen.getAllByRole('button', { name: '6' })[0]).toHaveClass('bg-primary');
    });

    it('no ofrece el par 7', () => {
      renderWith();

      expect(screen.queryByRole('button', { name: '7' })).toBeNull();
    });
  });

  describe('numero de barras', () => {
    it('acepta las 14 barras del backend', () => {
      renderWith({ tees: 14 });

      submitForm();

      expect(errores().some((m) => m.includes('teesRange'))).toBe(false);
    });

    it('rechaza 15 barras, una mas de las que el backend guarda', () => {
      renderWith({ tees: 15 });

      submitForm();

      expect(errores().some((m) => m.includes('teesRange'))).toBe(true);
    });

    it('acepta una sola barra, que es lo que tienen dos campos federados', () => {
      renderWith({ tees: 1 });

      submitForm();

      expect(errores().some((m) => m.includes('teesRange'))).toBe(false);
    });

    it('desactiva el boton de anadir al llegar a 14', () => {
      renderWith({ tees: 14 });

      expect(screen.getByRole('button', { name: /form\.addTee/ })).toBeDisabled();
    });

    it('sigue dejando anadir con 10 barras, que antes era el techo', () => {
      renderWith({ tees: 10 });

      expect(screen.getByRole('button', { name: /form\.addTee/ })).not.toBeDisabled();
    });

    it('deja bajar hasta una sola barra', () => {
      renderWith({ tees: 2 });

      // Con dos barras el boton de borrar ya existe: antes solo aparecia a
      // partir de tres, asi que no habia forma de llegar a una
      const borrar = screen.getAllByRole('button').filter((b) => b.className.includes('text-red-600'));
      expect(borrar).toHaveLength(2);

      fireEvent.click(borrar[0]);

      expect(screen.getByText('form.tees (1/14)')).toBeInTheDocument();
      expect(errores()).toHaveLength(0);
    });
  });
});
