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
  default: { error: vi.fn(), success: vi.fn() },
}));

/**
 * El formulario validaba un rango unico (CR 50-90, SR 55-155) sin mirar el tipo
 * de campo que el propio formulario deja elegir, asi que rechazaba valores que
 * el backend si admite: un pitch & putt federado tiene el CR por debajo de 50 y
 * el slope por debajo de 55. Se podia puntuar un campo corto pero no darlo de
 * alta a mano. Ver RyderCupAm#206.
 */
describe('GolfCourseForm · rangos de valoracion por tipo de campo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Se entra por `initialData` para que la validacion llegue hasta los ratings:
  // se corta en el primer fallo, y antes de las barras exige nombre y pais.
  const renderWith = (courseType, courseRating, slopeRating) =>
    render(
      <GolfCourseForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          name: 'Campo de prueba',
          countryCode: 'ES',
          courseType,
          tees: [
            { color: 'YELLOW', teeGender: 'MALE', courseRating, slopeRating },
            { color: 'WHITE', teeGender: 'MALE', courseRating, slopeRating },
          ],
        }}
      />
    );

  // En jsdom, pulsar el boton no dispara el `onSubmit` del form, y la validacion
  // vive ahi: sin esto los tests pasaban sin validar nada.
  const submitForm = () => {
    fireEvent.submit(screen.getByRole('button', { name: 'form.update' }).closest('form'));
  };

  const errores = () => customToast.error.mock.calls.map((c) => String(c[0]));

  it('acepta el rating de un pitch & putt federado', () => {
    renderWith('PITCH_AND_PUTT', 46.8, 47);

    submitForm();

    expect(errores().some((m) => m.includes('courseRatingRange'))).toBe(false);
    expect(errores().some((m) => m.includes('slopeRatingRange'))).toBe(false);
  });

  it('sigue rechazando ese mismo rating en un campo de 18 hoyos', () => {
    renderWith('STANDARD_18', 46.8, 47);

    submitForm();

    expect(errores().some((m) => m.includes('courseRatingRange'))).toBe(true);
  });

  it('acepta un slope 157 en un 18 hoyos, que el backend admite hasta 160', () => {
    renderWith('STANDARD_18', 73.1, 157);

    submitForm();

    expect(errores().some((m) => m.includes('slopeRatingRange'))).toBe(false);
  });

  it('anuncia el rango del tipo elegido, no uno fijo', () => {
    renderWith('PITCH_AND_PUTT', 20, 47);

    submitForm();

    const mensaje = errores().find((m) => m.includes('courseRatingRange'));
    expect(mensaje).toContain('"min":"45.0"');
    expect(mensaje).toContain('"max":"90.0"');
  });
});
