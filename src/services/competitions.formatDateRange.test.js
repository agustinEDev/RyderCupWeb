import { describe, it, expect, vi } from 'vitest';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

import { formatDateRange } from './competitions';

/** Las fechas del detalle salían siempre en inglés: 'en-US' fijo (FE #710). */
describe('formatDateRange', () => {
  it.each([
    ['es', '3 oct 2026 - 4 oct 2026'],
    ['en', 'Oct 3, 2026 - Oct 4, 2026'],
  ])('en %s, en ese idioma', (idioma, esperado) => {
    expect(formatDateRange('2026-10-03', '2026-10-04', idioma)).toBe(esperado);
  });

  it('un idioma que Intl no entiende no rompe la pantalla', () => {
    expect(() => formatDateRange('2026-10-03', '2026-10-04', 'no_es_un_idioma!')).not.toThrow();
  });
});
