import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (clave) => clave }) }));
vi.mock('../scoring/ScoreInputPanel', () => ({ default: () => null }));

import QuickMatchHoleInput from './QuickMatchHoleInput';

/**
 * FE #725 (opción B, solo los botones) en la partida rápida: el primer jugador
 * sin golpe en este hoyo es el siguiente; los demás vacíos, en borde verde.
 *
 *   Q1  nadie anotado                 | el primero es el siguiente, el resto en borde
 *   Q2  el primero anotado            | el segundo es el siguiente
 *   Q3  el primero recogió (raya)     | cuenta como anotado
 *   Q4  solo lectura                  | ningún botón de anotar
 */
const jugador = (id, extra = {}) => ({
  participantId: id,
  name: `Jugador ${id}`,
  score: null,
  isPickedUp: false,
  hole: { number: 7, par: 4, strokeIndex: 12, meters: null },
  ...extra,
});

const pintar = (entries, props = {}) =>
  render(
    <QuickMatchHoleInput
      holeNumber={7}
      par={4}
      strokeIndex={12}
      entries={entries}
      onScoreChange={vi.fn()}
      {...props}
    />
  );

const boton = (id) => screen.getByTestId(`quick-match-score-button-${id}`);

describe('QuickMatchHoleInput · el hueco para anotar (FE #725)', () => {
  it('Q1: nadie anotado, el primero es el siguiente', () => {
    pintar([jugador('p1'), jugador('p2'), jugador('p3')]);

    expect(within(boton('p1')).getByTestId('anotar-siguiente')).toBeInTheDocument();
    expect(within(boton('p2')).getByTestId('anotar')).toBeInTheDocument();
    expect(within(boton('p3')).getByTestId('anotar')).toBeInTheDocument();
  });

  it('Q2: el primero anotado, el segundo es el siguiente', () => {
    pintar([jugador('p1', { score: 4 }), jugador('p2'), jugador('p3')]);

    expect(within(boton('p1')).queryByTestId('anotar')).toBeNull();
    expect(within(boton('p2')).getByTestId('anotar-siguiente')).toBeInTheDocument();
    expect(within(boton('p3')).getByTestId('anotar')).toBeInTheDocument();
  });

  it('Q3: la raya cuenta como anotada', () => {
    pintar([jugador('p1', { isPickedUp: true }), jugador('p2')]);

    expect(within(boton('p2')).getByTestId('anotar-siguiente')).toBeInTheDocument();
  });

  it('Q4: en solo lectura no hay nada que tocar', () => {
    pintar([jugador('p1'), jugador('p2')], { isReadOnly: true });

    expect(screen.queryByTestId('anotar-siguiente')).toBeNull();
    expect(screen.queryByTestId('anotar')).toBeNull();
  });
});

describe('QuickMatchHoleInput — pie con las distancias (mapa de hoyos)', () => {
  it('16 oct: lo que se le pase en `accion` («Mapa») va en la cabecera del hoyo, junto a su número', () => {
    render(<QuickMatchHoleInput holeNumber={1} par={4} strokeIndex={1} entries={[]} accion={<button type="button">mapa-del-hoyo</button>} />);

    const accion = screen.getByTestId('accion-del-hoyo');
    expect(accion).toHaveTextContent('mapa-del-hoyo');
    // En la cabecera (la primera fila de la tarjeta, la de «Hoyo 1»), no en un pie aparte
    expect(accion.closest('[data-testid$="hole-input"]').firstElementChild).toContainElement(accion);
    expect(screen.queryByTestId('pie-del-hoyo')).toBeNull();
  });

  it('sin `accion`, ni el hueco', () => {
    render(<QuickMatchHoleInput holeNumber={1} par={4} strokeIndex={1} entries={[]} />);

    expect(screen.queryByTestId('accion-del-hoyo')).toBeNull();
  });

});
