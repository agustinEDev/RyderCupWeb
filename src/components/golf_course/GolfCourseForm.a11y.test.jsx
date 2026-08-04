import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GolfCourseForm from './GolfCourseForm';

// `t` devuelve la clave con sus parámetros para poder afirmar sobre la
// interpolación (qué hoyo y qué valor se anuncian), no solo sobre la clave.
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

const openPickerForHole = holeNumber => {
  const trigger = screen.getByRole('button', {
    name: new RegExp(`strokeIndexForHole.*"hole":${holeNumber}\\b`),
  });
  fireEvent.click(trigger);
  return trigger;
};

const getPicker = () => screen.getByRole('dialog');

describe('GolfCourseForm - accesibilidad del stroke index picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(<GolfCourseForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

  describe('ciclo de vida del foco', () => {
    it('mueve el foco dentro del panel al abrirlo, sobre el valor seleccionado', () => {
      renderForm();
      openPickerForHole(1);

      const picker = getPicker();
      expect(picker).toContainElement(document.activeElement);
      expect(document.activeElement).toHaveAttribute('aria-pressed', 'true');
    });

    it('devuelve el foco al hoyo que lo abrió al cerrar con la X', () => {
      renderForm();
      const trigger = openPickerForHole(3);

      fireEvent.click(
        within(getPicker()).getByRole('button', { name: 'form.closeStrokeIndexPicker' })
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });

    it('devuelve el foco al hoyo que lo abrió tras elegir un stroke index', () => {
      renderForm();
      const trigger = openPickerForHole(2);

      // El stroke index 7 lo ocupa el hoyo 7, así que se anuncia como ocupado.
      fireEvent.click(
        within(getPicker()).getByRole('button', {
          name: /strokeIndexUsedByHole.*"value":7,/,
        })
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });

    it('cierra con Escape y restaura el foco', () => {
      renderForm();
      const trigger = openPickerForHole(5);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });

    it('atrapa el Tab dentro del panel', () => {
      renderForm();
      openPickerForHole(1);

      const picker = getPicker();
      const focusables = Array.from(picker.querySelectorAll('button'));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(first);

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(last);
    });

    it('deja de escuchar el teclado una vez cerrado', () => {
      renderForm();
      openPickerForHole(1);
      fireEvent.keyDown(document, { key: 'Escape' });

      // Un segundo Escape con el panel ya cerrado no debe romper nada.
      expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('estados expuestos a tecnologías de asistencia', () => {
    it('marca el stroke index seleccionado con aria-pressed', () => {
      renderForm();
      openPickerForHole(4);

      const picker = getPicker();
      const pressed = within(picker)
        .getAllByRole('button')
        .filter(b => b.getAttribute('aria-pressed') === 'true');

      // El hoyo 4 arranca con stroke index 4.
      expect(pressed).toHaveLength(1);
      expect(pressed[0]).toHaveTextContent('4');
    });

    it('anuncia qué hoyo ocupa un stroke index y que se intercambiarán', () => {
      renderForm();
      openPickerForHole(1);

      // El stroke index 9 lo ocupa el hoyo 9 por defecto.
      const occupied = within(getPicker()).getByRole('button', {
        name: /strokeIndexUsedByHole.*"hole":9/,
      });

      expect(occupied).toHaveAttribute('aria-pressed', 'false');
    });

    it('no describe como ocupado el stroke index propio', () => {
      renderForm();
      openPickerForHole(6);

      const selected = within(getPicker()).getByRole('button', { name: '6' });
      expect(selected).toHaveAttribute('aria-pressed', 'true');
    });

    it('el disparador declara que abre un diálogo y si está abierto', () => {
      renderForm();
      const trigger = openPickerForHole(2);

      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
