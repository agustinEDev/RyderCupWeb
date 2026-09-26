import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

const SetupModeChooser = (await import('./SetupModeChooser')).default;

describe('SetupModeChooser · las tarjetas alineadas (FE #710)', () => {
  it('el contenido de todas empieza arriba: «Todo automático» es más alta', () => {
    // Un botón centra su contenido en vertical: las bajas quedaban centradas y
    // la de «próximamente» arriba, y los iconos no se alineaban
    render(<SetupModeChooser onSelect={vi.fn()} />);

    for (const id of ['AUTOMATIC', 'MANUAL', 'RYDER_CUP']) {
      const clases = screen.getByTestId(`modo-${id}`).className;
      expect(clases).toContain('flex-col');
      expect(clases).toContain('justify-start');
    }
  });
});
