import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('./RoundCard', () => ({
  default: ({ round, canEdit }) => (
    <div data-testid="tarjeta" data-ronda={round.id} data-edita={canEdit} />
  ),
}));

import SesionDeLaAgenda from './SesionDeLaAgenda';

const tComp = (clave) => clave;

const pintar = (botones, onRehacerSobres = vi.fn()) =>
  render(
    <MemoryRouter>
      <SesionDeLaAgenda
        round={{ id: 'r1' }}
        competitionId="comp-1"
        botones={botones}
        onRehacerSobres={onRehacerSobres}
        tComp={tComp}
        canEdit
      />
    </MemoryRouter>,
  );

describe('SesionDeLaAgenda', () => {
  it('con los dos botones: el sobre de la sesión y rehacerlos', () => {
    const onRehacerSobres = vi.fn();
    pintar({ abrirSobre: true, rehacerSobres: true }, onRehacerSobres);

    expect(screen.getByTestId('ir-al-sobre-r1')).toHaveAttribute(
      'href',
      '/competitions/comp-1/rounds/r1/envelope',
    );
    fireEvent.click(screen.getByTestId('rehacer-sobres-r1'));
    expect(onRehacerSobres).toHaveBeenCalledWith('r1');
  });

  it('sin botones, solo la tarjeta, con sus props', () => {
    pintar({ abrirSobre: false, rehacerSobres: false });

    expect(screen.queryByTestId('ir-al-sobre-r1')).toBeNull();
    expect(screen.queryByTestId('rehacer-sobres-r1')).toBeNull();
    const tarjeta = screen.getByTestId('tarjeta');
    expect(tarjeta).toHaveAttribute('data-ronda', 'r1');
    expect(tarjeta).toHaveAttribute('data-edita', 'true');
  });

  // Cada botón por su permiso: un capitán abre su sobre, pero rehacerlos es
  // cosa del organizador (CodeRabbit)
  it('un capitán: solo el sobre', () => {
    pintar({ abrirSobre: true, rehacerSobres: false });

    expect(screen.getByTestId('ir-al-sobre-r1')).toBeInTheDocument();
    expect(screen.queryByTestId('rehacer-sobres-r1')).toBeNull();
  });

  it('quien gestiona sin ser capitán: solo rehacerlos', () => {
    pintar({ abrirSobre: false, rehacerSobres: true });

    expect(screen.queryByTestId('ir-al-sobre-r1')).toBeNull();
    expect(screen.getByTestId('rehacer-sobres-r1')).toBeInTheDocument();
  });

  it('los botones, antes que la tarjeta', () => {
    pintar({ abrirSobre: true, rehacerSobres: true });
    const orden = [
      screen.getByTestId('ir-al-sobre-r1'),
      screen.getByTestId('rehacer-sobres-r1'),
      screen.getByTestId('tarjeta'),
    ];
    expect(orden[0].compareDocumentPosition(orden[1])).toBe(
      globalThis.Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(orden[1].compareDocumentPosition(orden[2])).toBe(
      globalThis.Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
