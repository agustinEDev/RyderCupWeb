import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

/**
 * El nombre con su hándicap de juego al lado, «Ana Hcp juego 10» (QA del 21 oct
 * 2026; «HCP» queda para el índice desde el 24 oct).
 * Una sola pieza para la tabla de match play y las tarjetas de stroke play.
 *
 *   caso | hándicap      | se ve
 *   -----|---------------|----------------------------------------------
 *   C1   | 10            | «Hcp juego 10» a la vista; el largo, al lector
 *   C2   | -2 (plus)     | «+2»
 *   C3   | 0             | «0», sin signo
 *   C4   | null          | solo el nombre
 *   C5   | clases        | las de quien la usa, en la caja y en el nombre
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const { default: NombreConHandicap } = await import('./NombreConHandicap');

const pintar = (props = {}) =>
  render(<NombreConHandicap userId="ana" nombre="Ana" playingHandicap={10} testId="caja" {...props} />);

describe('NombreConHandicap', () => {
  it('C1: el nombre y «HCP 10» a la vista; el largo, solo para el lector', () => {
    pintar();

    const hcp = screen.getByTestId('hcp-de-juego-ana');
    expect(screen.getByTestId('caja')).toContainElement(hcp);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(hcp).toHaveClass('ml-1', 'shrink-0', 'whitespace-nowrap', 'text-[10px]', 'font-normal', 'text-gray-500');
    expect(within(hcp).getByText('scorecard.playingHandicapShort {"value":"10"}')).toHaveAttribute('aria-hidden', 'true');
    expect(within(hcp).getByText('scorecard.playingHandicap {"value":"10"}')).toHaveClass('sr-only');
  });

  it('C2: un plus se escribe con «+»', () => {
    pintar({ playingHandicap: -2 });

    expect(screen.getByTestId('hcp-de-juego-ana')).toHaveTextContent('scorecard.playingHandicapShort {"value":"+2"}');
  });

  it('C3: el cero también, sin signo', () => {
    pintar({ playingHandicap: 0 });

    expect(screen.getByTestId('hcp-de-juego-ana')).toHaveTextContent('scorecard.playingHandicapShort {"value":"0"}');
  });

  it('C4: sin hándicap, solo el nombre', () => {
    pintar({ playingHandicap: null });

    expect(screen.queryByTestId('hcp-de-juego-ana')).toBeNull();
    expect(screen.getByTestId('caja').textContent).toBe('Ana');
  });

  it('C5: las clases de quien la usa, en la caja y en el nombre', () => {
    pintar({ className: 'flex min-w-0', nombreClassName: 'min-w-0 truncate' });

    expect(screen.getByTestId('caja')).toHaveClass('flex', 'min-w-0');
    expect(screen.getByText('Ana')).toHaveClass('min-w-0', 'truncate');
    expect(screen.getByText('Ana').parentElement).toBe(screen.getByTestId('caja'));
  });
});
