import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Un idioma que Intl no acepta (con guion bajo, como lo guardan algunos
// navegadores viejos): la sección se pinta igual (/code-review)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es_ES' },
  }),
}));

const StrokePlaySettings = (await import('./StrokePlaySettings')).default;
const { formularioDeAjustes } = await import('../../utils/ajustesDeStrokePlay');

describe('StrokePlaySettings · con un idioma que Intl no acepta', () => {
  it('pinta la vista previa sin romperse', () => {
    render(
      <StrokePlaySettings
        valor={{ ...formularioDeAjustes(null), limites: ['12,0'] }}
        onCambio={() => {}}
        tipo="STABLEFORD"
        dias={2}
      />
    );

    expect(screen.getByTestId('vista-previa')).toHaveTextContent('12');
  });
});
