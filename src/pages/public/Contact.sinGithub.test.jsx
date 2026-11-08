import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

/**
 * Contacto ya no manda a GitHub (bloque 4 de la release del 7 nov): el contacto es
 * el formulario y el correo.
 */
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (clave) => clave }) }));
vi.mock('../../components/layout/Header', () => ({ default: () => null }));
vi.mock('../../components/layout/Footer', () => ({ default: () => null }));
vi.mock('../../composition', () => ({ submitContactFormUseCase: { execute: vi.fn() } }));
vi.mock('../../utils/toast', () => ({ customToast: { success: vi.fn(), error: vi.fn() } }));

const { default: Contact } = await import('./Contact');

describe('Contacto', () => {
  it('no enlaza a GitHub', () => {
    const { container } = render(<Contact />);

    expect(container.querySelector('a[href*="github.com"]')).toBeNull();
    expect(container.textContent).not.toContain('info.github');
  });
});
