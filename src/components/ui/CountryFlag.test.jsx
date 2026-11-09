import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CountryFlag } from './CountryFlag';

/**
 * La bandera pinta lo mismo desde que pasó de `React.createElement` a JSX
 * (9 nov 2026): la imagen de flagcdn y, si no carga, el emoji. El HTML se
 * compara entero (el orden de los atributos de <img> lo pone React).
 */
describe('CountryFlag', () => {
  it('pinta la imagen de flagcdn con sus atributos', () => {
    const { container } = render(
      <CountryFlag countryCode="es" className="w-6" style={{ width: '24px' }} title="España" />
    );

    expect(container.innerHTML).toBe(
      '<img width="40" height="30" alt="España" title="España" class="w-6" loading="lazy" style="display: inline-block; vertical-align: middle; width: 24px;" srcset="https://flagcdn.com/w80/es.png 2x" src="https://flagcdn.com/w40/es.png">'
    );
  });

  it('sin título, el código hace de texto alternativo y no hay title', () => {
    const { container } = render(<CountryFlag countryCode="FR" />);

    expect(container.innerHTML).toBe(
      '<img width="40" height="30" alt="FR" class="" loading="lazy" style="display: inline-block; vertical-align: middle;" srcset="https://flagcdn.com/w80/fr.png 2x" src="https://flagcdn.com/w40/fr.png">'
    );
  });

  it('si la imagen no carga, pinta el emoji', () => {
    const { container } = render(<CountryFlag countryCode="ES" className="w-6" title="España" />);

    fireEvent.error(container.querySelector('img'));

    expect(container.innerHTML).toBe(
      '<span role="img" aria-label="España" title="España" class="w-6" style="display: inline-block; vertical-align: middle;">🇪🇸</span>'
    );
  });

  it.each([[undefined], [''], ['ESP'], ['1A'], [42]])('con un código no válido (%s) no pinta nada', (codigo) => {
    const { container } = render(<CountryFlag countryCode={codigo} />);

    expect(container.innerHTML).toBe('');
  });
});
