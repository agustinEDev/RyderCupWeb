/**
 * El nombre de cada barra en «Tu barra» (FE #1025; nombre común desde el 4 nov
 * 2026, `nombreDeLaBarra`): el (M)/(F) solo en la del otro género, y en el
 * panel «Otras» ninguno (el encabezado de cada grupo ya dice el género).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BarrasDeTuGenero from './BarrasDeTuGenero';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

const t = (key) => key;
const TEES = [
  { color: 'YELLOW', gender: 'MALE' },
  { color: 'RED', gender: 'FEMALE' },
];

const pinta = (value) =>
  render(<BarrasDeTuGenero t={t} courseTees={TEES} genero="MALE" value={value} onChange={vi.fn()} />);

describe('BarrasDeTuGenero · el nombre de cada barra', () => {
  it('la de tu género, sin (M)', () => {
    pinta('YELLOW|MALE');

    expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toHaveAttribute(
      'aria-label',
      'form.teeColors.YELLOW'
    );
  });

  it('la del otro género, elegida en «Otras», con su (F)', () => {
    pinta('RED|FEMALE');

    expect(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE')).toHaveAttribute(
      'aria-label',
      'form.teeColors.RED (F)'
    );
  });

  it('en el panel «Otras», sin sufijo: el grupo ya dice el género', () => {
    pinta('YELLOW|MALE');
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));

    const opcion = screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE');
    expect(within(opcion).getByText('form.teeColors.RED')).toBeInTheDocument();
    expect(opcion.textContent).not.toMatch(/\((M|F)\)/);
  });
});
