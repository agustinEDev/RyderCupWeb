import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (clave) => clave }) }));

import { HuecoParaAnotar } from './HuecoParaAnotar';
import { clasesDelHueco } from './clasesDelHueco';

/**
 * El hueco donde se toca para anotar un golpe (FE #725, opción B de Agustín,
 * solo los botones). Parecía desactivado: gris sobre gris, o un borde
 * discontinuo vacío.
 *
 *   #   caso            | cómo se ve
 *   ----|---------------|-------------------------------------------
 *   H1  el siguiente    | verde lleno, con «+» y «Anotar»
 *   H2  los demás       | borde verde, con «Anotar» y sin «+»
 */
describe('HuecoParaAnotar', () => {
  it('H1: el siguiente, verde lleno con el «+»', () => {
    render(<HuecoParaAnotar siguiente />);

    expect(screen.getByTestId('anotar-siguiente')).toHaveTextContent('input.tapToScore');
    expect(screen.getByTestId('anotar-mas')).toBeInTheDocument();
    expect(clasesDelHueco(true)).toContain('bg-primary');
  });

  it('H2: los demás, borde verde y sin «+»', () => {
    render(<HuecoParaAnotar siguiente={false} />);

    expect(screen.getByTestId('anotar')).toHaveTextContent('input.tapToScore');
    expect(screen.queryByTestId('anotar-mas')).toBeNull();
    expect(clasesDelHueco(false)).toContain('border-primary');
    expect(clasesDelHueco(false)).not.toContain('bg-primary ');
  });
});
