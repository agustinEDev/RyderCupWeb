import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NombrePequeno from './NombrePequeno';

describe('NombrePequeno · el otro nombre, debajo (SB-08)', () => {
  it('pinta el texto en pequeño', () => {
    render(<NombrePequeno texto="Agustín Estévez" />);

    expect(screen.getByTestId('nombre-pequeno')).toHaveTextContent(
      'Agustín Estévez',
    );
  });

  it('sin texto no ocupa sitio', () => {
    const { container } = render(<NombrePequeno texto="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
