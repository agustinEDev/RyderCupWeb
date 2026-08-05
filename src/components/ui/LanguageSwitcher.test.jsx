import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LanguageSwitcher from './LanguageSwitcher';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

/**
 * Con el menú de móvil retirado (FE #306) este selector pasa a vivir en Perfil,
 * donde se toca con el dedo: sus 40 px naturales se quedaban cortos.
 */
describe('LanguageSwitcher', () => {
  it('reaches the 44px touch target on mobile', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select.className).toContain('min-h-[44px]');
    // en escritorio no aplica: se alinea con los controles de 40 px del header
    expect(select.className).toContain('md:min-h-0');
  });
});
