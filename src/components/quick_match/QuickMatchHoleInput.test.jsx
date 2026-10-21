import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// Con `count` se pega detrás: así se ve que el número llega a la frase
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, opts) => (opts?.count != null ? `${clave}:${opts.count}` : clave),
  }),
}));
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

describe('QuickMatchHoleInput — sin «Mapa» dentro (mapa de hoyos)', () => {
  it('16 oct: la tarjeta no lleva «Mapa» (va entre Anterior y Siguiente)', () => {
    render(<QuickMatchHoleInput holeNumber={1} par={4} strokeIndex={1} entries={[]} />);

    expect(screen.queryByRole('button', { name: /mapa/i })).toBeNull();
    expect(screen.queryByTestId('accion-del-hoyo')).toBeNull();
  });

});

/**
 * «Tu vuelta» (21 oct): el acumulado neto de quien anota, en la casilla libre
 * cuando solo se anota a sí mismo y en una línea bajo los botones si anota a
 * más gente.
 *
 *   N1  solo se anota a sí mismo   | V1: casilla dentro de la rejilla, sin línea
 *   N1  impar (1, 3…): queda hueco  | V1, V1b: casilla dentro de la rejilla, sin línea
 *   N2  par (2, 4…): no hay hueco   | V2, V2b: una línea bajo los botones, sin casilla
 *   N4  Stableford                  | V3: «+2 · 16 pts»
 *   N5  sin vuelta (foursomes)      | V4: ni casilla ni línea
 *   N9  sin hoyos anotados          | V5: «—», también en Stableford
 *       solo lectura                | V6: se sigue viendo
 *       lector de pantalla          | V7: oye la frase entera, no «+2»
 *   N10 la tarjeta no crece         | V1 (en la rejilla) y V2 (una sola línea)
 */
describe('QuickMatchHoleInput · «Tu vuelta»', () => {
  const vuelta = (extra = {}) => ({
    toPar: 2,
    toParLabel: '+2',
    stablefordPoints: null,
    holesPlayed: 3,
    ...extra,
  });

  it('V1: con una sola casilla, la vuelta ocupa la libre de la rejilla', () => {
    pintar([jugador('p1')], { myRound: vuelta() });

    const casilla = screen.getByTestId('quick-match-my-round-cell');
    expect(casilla.parentElement).toHaveClass('grid', 'grid-cols-2');
    expect(casilla).toHaveTextContent('input.myRound');
    expect(casilla).toHaveTextContent('+2');
    expect(screen.queryByTestId('quick-match-my-round-line')).toBeNull();
  });

  it('V2: anotando a más gente, una sola línea bajo los botones', () => {
    pintar([jugador('p1'), jugador('p2')], { myRound: vuelta() });

    const linea = screen.getByTestId('quick-match-my-round-line');
    expect(linea).toHaveTextContent('input.myRound: +2');
    expect(linea).toHaveClass('whitespace-nowrap', 'truncate', 'text-xs');
    // Debajo de la rejilla de botones, no dentro
    const rejilla = boton('p1').closest('.grid');
    expect(rejilla.contains(linea)).toBe(false);
    expect(rejilla.compareDocumentPosition(linea) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('quick-match-my-round-cell')).toBeNull();
  });

  it('V1b: con tres casillas también queda una libre, y la vuelta va en ella (Agustín, 21 oct)', () => {
    pintar([jugador('p1'), jugador('p2'), jugador('p3')], { myRound: vuelta() });

    const casilla = screen.getByTestId('quick-match-my-round-cell');
    expect(casilla.parentElement).toHaveClass('grid', 'grid-cols-2');
    expect(casilla).toHaveTextContent('+2');
    expect(screen.queryByTestId('quick-match-my-round-line')).toBeNull();
  });

  it('V2b: con cuatro no hay hueco: la línea', () => {
    pintar([jugador('p1'), jugador('p2'), jugador('p3'), jugador('p4')], { myRound: vuelta() });

    expect(screen.getByTestId('quick-match-my-round-line')).toHaveTextContent('input.myRound: +2');
    expect(screen.queryByTestId('quick-match-my-round-cell')).toBeNull();
  });

  it('V3: en Stableford, el neto y los puntos', () => {
    pintar([jugador('p1')], { myRound: vuelta({ stablefordPoints: 16 }) });

    expect(screen.getByTestId('quick-match-my-round-cell')).toHaveTextContent(
      '+2 · input.myRoundPoints:16'
    );
  });

  it('V4: sin vuelta que enseñar no sale nada', () => {
    pintar([jugador('p1')], { myRound: null });
    expect(screen.queryByTestId('quick-match-my-round-cell')).toBeNull();

    pintar([jugador('p2'), jugador('p3')]);
    expect(screen.queryByTestId('quick-match-my-round-line')).toBeNull();
  });

  it('V5: sin hoyos anotados, un guion, también en Stableford', () => {
    pintar([jugador('p1')], {
      myRound: vuelta({ toPar: null, toParLabel: null, stablefordPoints: 0, holesPlayed: 0 }),
    });

    const casilla = screen.getByTestId('quick-match-my-round-cell');
    expect(casilla).toHaveTextContent('—');
    expect(casilla).not.toHaveTextContent('myRoundPoints');
  });

  it('V6: en solo lectura se sigue viendo', () => {
    pintar([jugador('p1')], { myRound: vuelta(), isReadOnly: true });

    expect(screen.getByTestId('quick-match-my-round-cell')).toHaveTextContent('+2');
  });

  it('V7: el lector de pantalla oye la frase, no el signo', () => {
    const { unmount } = pintar([jugador('p1')], { myRound: vuelta({ stablefordPoints: 16 }) });
    const casilla = screen.getByTestId('quick-match-my-round-cell');
    expect(within(casilla).getByText('input.myRoundA11yOver:2 input.myRoundA11yPoints:16')).toHaveClass('sr-only');
    unmount();

    pintar([jugador('p1'), jugador('p2')], { myRound: vuelta({ toPar: -1, toParLabel: '-1' }) });
    expect(within(screen.getByTestId('quick-match-my-round-line')).getByText('input.myRoundA11yUnder:1')).toHaveClass('sr-only');
  });

  // Revisión final del 21 oct: un valor largo de Stableford no puede ensanchar
  // la columna a 360 px, y la casilla no debe parecer el golpe de otro jugador
  it('V8: la casilla no ensancha la rejilla: min-w-0 y el valor recortado', () => {
    pintar([jugador('p1')], { myRound: vuelta({ toParLabel: '+12', toPar: 12, stablefordPoints: 36 }) });

    const casilla = screen.getByTestId('quick-match-my-round-cell');
    expect(casilla).toHaveClass('min-w-0');
    const valor = screen.getByTestId('quick-match-my-round-value');
    expect(casilla.contains(valor)).toBe(true);
    expect(valor).toHaveClass('truncate', 'min-w-0');
    expect(valor).toHaveTextContent('+12 · input.myRoundPoints:36');
    // Con puntos, más pequeño; sin ellos, text-base. Nunca el text-lg del golpe
    expect(valor).toHaveClass('text-sm');
    expect(valor).not.toHaveClass('text-lg');
  });

  it('V8b: sin puntos el valor va en text-base', () => {
    pintar([jugador('p1')], { myRound: vuelta() });

    const valor = screen.getByTestId('quick-match-my-round-value');
    expect(valor).toHaveClass('text-base', 'truncate');
    expect(valor).not.toHaveClass('text-lg', 'text-sm');
  });

  it('V9: no se parece a la casilla de un golpe: sin fondo gris, borde discontinuo', () => {
    pintar([jugador('p1')], { myRound: vuelta() });

    const caja = screen.getByTestId('quick-match-my-round-value').parentElement;
    expect(caja).toHaveClass('border-dashed');
    const clasesDelGolpe = boton('p1').className.split(/\s+/);
    expect(clasesDelGolpe.some((c) => c.startsWith('bg-'))).toBe(true);
    expect(caja.className.split(/\s+/).some((c) => c.startsWith('bg-gray-1'))).toBe(false);
    expect(caja.tagName).not.toBe('BUTTON');
  });

  it('V10: al par se dice con t(), no con el «PAR» fijo del cálculo', () => {
    const { unmount } = pintar([jugador('p1')], { myRound: vuelta({ toPar: 0, toParLabel: 'PAR' }) });
    expect(screen.getByTestId('quick-match-my-round-value')).toHaveTextContent('input.myRoundPar');
    unmount();

    pintar([jugador('p1'), jugador('p2')], {
      myRound: vuelta({ toPar: 0, toParLabel: 'PAR', stablefordPoints: 18 }),
    });
    expect(screen.getByTestId('quick-match-my-round-line')).toHaveTextContent(
      'input.myRound: input.myRoundPar · input.myRoundPoints:18'
    );
  });

  it('V10b: los valores con signo siguen siendo números', () => {
    pintar([jugador('p1')], { myRound: vuelta({ toPar: -1, toParLabel: '-1' }) });
    expect(screen.getByTestId('quick-match-my-round-value')).toHaveTextContent(/^-1$/);
  });

  it('V7b: al par, y sin hoyos, frases propias', () => {
    const { unmount } = pintar([jugador('p1')], { myRound: vuelta({ toPar: 0, toParLabel: 'PAR' }) });
    expect(screen.getByText('input.myRoundA11yPar')).toHaveClass('sr-only');
    unmount();

    pintar([jugador('p1')], { myRound: vuelta({ toPar: null, toParLabel: null, holesPlayed: 0 }) });
    expect(screen.getByText('input.myRoundA11yNone')).toHaveClass('sr-only');
  });
});
