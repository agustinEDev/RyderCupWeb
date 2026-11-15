import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import EnrollmentOpeningModal from './EnrollmentOpeningModal';

/**
 * F4 · La apertura programada, de 2 a 14 días antes (15 nov 2026;
 * RyderCupAm #865): con uno abría a las 0:00 del día anterior y cerraba a las
 * 12:00 de ese mismo día, por el plazo de inscripción.
 *
 *   caso                                | qué pasa
 *   ------------------------------------|--------------------------------
 *   O1 se elige programarla             | se ofrecen de 2 a 14 días
 *   O2 sin tocar los días               | se manda 2, el mínimo
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, p) => (p?.count !== undefined ? `${k}_${p.count}` : k),
    i18n: { language: 'es' },
  }),
}));

const pinta = (onConfirm = vi.fn()) => {
  render(
    <EnrollmentOpeningModal
      isOpen
      startDate="2030-06-10"
      onConfirm={onConfirm}
      onClose={vi.fn()}
      isLoading={false}
    />,
  );
  return onConfirm;
};

describe('EnrollmentOpeningModal · de 2 a 14 días', () => {
  it('O1: Given programarla, When se abren los días, Then de 2 a 14', () => {
    pinta();
    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));

    const opciones = within(screen.getByTestId('apertura-dias'))
      .getAllByRole('option')
      .map((o) => Number(o.value));
    expect(opciones).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('O2: Given no toca los días, When confirma, Then se mandan 2', () => {
    const confirmar = pinta();
    fireEvent.click(screen.getByTestId('apertura-PROGRAMADA'));
    fireEvent.click(screen.getByTestId('confirmar-apertura'));

    expect(confirmar).toHaveBeenCalledWith(2);
  });
});
