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
  const renderWith = (courseType, courseRating, slopeRating, parPorHoyo = null) => {
    const onSubmit = vi.fn();
    render(
      <GolfCourseForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initialData={{
          name: 'Campo de prueba',
          countryCode: 'ES',
          courseType,
          tees: [
            { color: 'YELLOW', teeGender: 'MALE', courseRating, slopeRating },
            { color: 'WHITE', teeGender: 'MALE', courseRating, slopeRating },
          ],
          ...(parPorHoyo
            ? {
                holes: Array.from({ length: 18 }, (_, i) => ({
                  holeNumber: i + 1,
                  par: parPorHoyo,
                  strokeIndex: i + 1,
                })),
              }
            : {}),
        }}
      />
    );
    return onSubmit;
  };

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
  /**
   * El navegador valida los `min`/`max` del input ANTES de llamar al onSubmit,
   * asi que con esos atributos fijos la validacion por tipo de arriba no llegaba
   * a ejecutarse: en Chrome el formulario no se enviaba. jsdom no aplica la
   * validacion nativa, asi que los tests de submit pasaban igual y no lo veian.
   * Se comprueban los atributos directamente.
   */
  describe('los limites nativos de los inputs siguen al tipo de campo', () => {
    const ratingsDeLaPrimeraBarra = () => {
      const numeric = screen.getAllByRole('spinbutton');
      return { courseRating: numeric[0], slopeRating: numeric[1] };
    };

    it('afloja los limites en un pitch & putt', () => {
      renderWith('PITCH_AND_PUTT', 46.8, 47);

      const { courseRating, slopeRating } = ratingsDeLaPrimeraBarra();
      expect(courseRating).toHaveAttribute('min', '45');
      expect(courseRating).toHaveAttribute('max', '90');
      expect(slopeRating).toHaveAttribute('min', '40');
      expect(slopeRating).toHaveAttribute('max', '155');
    });

    it('mantiene los del campo largo en un 18 hoyos, con el techo de slope en 160', () => {
      renderWith('STANDARD_18', 73.1, 130);

      const { courseRating, slopeRating } = ratingsDeLaPrimeraBarra();
      expect(courseRating).toHaveAttribute('min', '50');
      expect(slopeRating).toHaveAttribute('min', '55');
      // 160 y no 155: hay campos federados por encima del maximo WHS
      expect(slopeRating).toHaveAttribute('max', '160');
    });
  });

  /**
   * El par total tambien se validaba contra un rango fijo de 18 hoyos, asi que
   * un pitch & putt de par 54 —el minimo del catalogo— se rechazaba.
   */
  describe('el par total sigue al tipo de campo', () => {
    it('acepta el par 54 de un pitch & putt', () => {
      const onSubmit = renderWith('PITCH_AND_PUTT', 46.8, 47, 3);

      submitForm();

      // Se comprueba que ENVIA, no que no se queja: la ausencia del error
      // tambien la daria por buena cualquier otra regla que cortase antes.
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(errores()).toEqual([]);
    });

    it('rechaza ese mismo par 54 en un campo de 18 hoyos, y dice su rango', () => {
      const onSubmit = renderWith('STANDARD_18', 73.1, 130, 3);

      submitForm();

      const mensaje = errores().find((m) => m.includes('totalParRange'));
      expect(mensaje).toContain('"min":66');
      expect(mensaje).toContain('"max":76');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
  /**
   * Lo que ve el usuario: los limites tienen que moverse al CAMBIAR el tipo en
   * el propio formulario, no solo al abrirlo con uno ya puesto.
   */
  describe('al cambiar el tipo en el formulario', () => {
    it('afloja los limites en cuanto se elige pitch & putt', () => {
      renderWith('STANDARD_18', 73.1, 130);

      const antes = screen.getAllByRole('spinbutton')[0];
      expect(antes).toHaveAttribute('min', '50');

      fireEvent.click(screen.getByRole('button', { name: 'form.courseTypes.PITCH_AND_PUTT' }));

      const [courseRating, slopeRating] = screen.getAllByRole('spinbutton');
      expect(courseRating).toHaveAttribute('min', '45');
      expect(slopeRating).toHaveAttribute('min', '40');
    });

    it('y los vuelve a apretar al volver a 18 hoyos', () => {
      renderWith('PITCH_AND_PUTT', 46.8, 47);

      fireEvent.click(screen.getByRole('button', { name: 'form.courseTypes.STANDARD_18' }));

      const [courseRating, slopeRating] = screen.getAllByRole('spinbutton');
      expect(courseRating).toHaveAttribute('min', '50');
      expect(slopeRating).toHaveAttribute('min', '55');
    });
  });
});
