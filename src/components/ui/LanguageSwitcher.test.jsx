import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from './LanguageSwitcher';

const { changeLanguage } = vi.hoisted(() => ({ changeLanguage: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage },
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

  // QA del 20 oct: el idioma vuelve a la barra de escritorio con sesion, pero
  // entre md y xl no cabe un selector con texto. Variante de solo icono
  describe('variante compacta', () => {
    it('I1: es solo un globo, sin texto, con su nombre accesible traducido', () => {
      render(<LanguageSwitcher compacto />);

      const caja = screen.getByTestId('idioma-compacto');
      expect(caja.querySelector('svg')).not.toBeNull();
      expect(caja).toHaveClass('h-10', 'w-10');
      const select = screen.getByRole('combobox', { name: 'header.changeLanguage' });
      // El select nativo va encima del globo, invisible: se ve el icono y
      // se abre el selector del sistema, accesible y sin menu propio
      expect(select).toHaveClass('absolute', 'inset-0', 'opacity-0');
    });

    it('I1b: cambiar desde ella cambia el idioma igual que la normal', () => {
      render(<LanguageSwitcher compacto />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });

      expect(changeLanguage).toHaveBeenCalledWith('en');
    });

    it('I1c: con el select invisible, el foco de teclado se ve en el globo', () => {
      render(<LanguageSwitcher compacto />);

      expect(screen.getByTestId('idioma-compacto')).toHaveClass('focus-within:ring-2');
    });

    it('I1d: las opciones dicen el idioma, no solo una bandera', () => {
      render(<LanguageSwitcher compacto />);

      expect(screen.getByRole('option', { name: 'Español' })).toHaveValue('es');
      expect(screen.getByRole('option', { name: 'English' })).toHaveValue('en');
    });

    it('I1e: la normal no cambia', () => {
      render(<LanguageSwitcher />);

      expect(screen.queryByTestId('idioma-compacto')).toBeNull();
      expect(screen.getByRole('combobox', { name: 'Select language' })).not.toHaveClass('opacity-0');
    });
  });
});
