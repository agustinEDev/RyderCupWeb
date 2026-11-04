/**
 * La etiqueta de una barra: su nombre (`nombreDeLaBarra`) con el género solo
 * si se le pasa (revisor, 4 nov 2026: hasta ahora solo se probaba de rebote).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TeeColorBadge from './TeeColorBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

describe('TeeColorBadge', () => {
  it.each([
    [{ color: 'YELLOW' }, 'form.teeColors.YELLOW'],
    [{ color: 'YELLOW', gender: 'MALE' }, 'form.teeColors.YELLOW (M)'],
    [{ color: 'RED', gender: 'FEMALE', identifier: 'Campeonato' }, 'Campeonato (F)'],
  ])('%o → %s', (props, texto) => {
    const { container } = render(<TeeColorBadge {...props} />);
    expect(container.textContent).toBe(texto);
  });
});
