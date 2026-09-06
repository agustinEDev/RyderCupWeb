import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import ScoringBreakdown from './ScoringBreakdown';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'es' },
  }),
}));

/**
 * El desglose de golpes en pantalla (FE #592).
 *
 * Lo que se vigila aquí son las tres cosas que la vista puede romper en
 * silencio: enseñar el neto creyendo que es el bruto, mezclar las dos escalas
 * —por hoyo y por vuelta— y pintar como cero una mitad que no se jugó.
 */
describe('ScoringBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Los números son los de una vuelta real: en bruto parece un desastre y en
  // neto son dos birdies. Es justo por eso que se dan las dos
  const desglose = (extra = {}) => ({
    holesCounted: 9,
    roundsCounted: 1,
    grossDistribution: { birdieOrBetter: 0, par: 2, bogey: 4, doubleOrWorse: 3, holes: 9 },
    netDistribution: { birdieOrBetter: 2, par: 4, bogey: 3, doubleOrWorse: 0, holes: 9 },
    byPar: [
      { par: 3, holes: 3, averageToPar: 1 },
      { par: 4, holes: 4, averageToPar: 0 },
      { par: 5, holes: 2, averageToPar: -1 },
    ],
    frontNine: { holes: 9, averageToPar: 0.11 },
    backNine: null,
    byCourse: [
      { golfCourseId: 'c1', golfCourseName: 'Son Parc - Par 71', rounds: 1, averageToPar: 2 },
    ],
    ...extra,
  });

  const pintar = (datos = desglose()) => render(<ScoringBreakdown breakdown={datos} />);

  describe('estado vacío', () => {
    it('lo muestra cuando no hay ni un hoyo contado', () => {
      pintar(desglose({ holesCounted: 0 }));

      expect(screen.getByTestId('breakdown-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('scoring-breakdown')).toBeNull();
    });

    it('lo muestra cuando no llega nada', () => {
      render(<ScoringBreakdown breakdown={null} />);

      expect(screen.getByTestId('breakdown-empty')).toBeInTheDocument();
    });

    // Con cero vueltas casi nunca faltan partidas: es que están sin terminar,
    // son foursomes o media tarjeta. Decirlo evita que parezca una avería
    it('explica por qué está vacío', () => {
      pintar(desglose({ holesCounted: 0 }));

      expect(screen.getByText('breakdown.emptyDescription')).toBeInTheDocument();
    });
  });

  describe('distribución', () => {
    it('arranca en bruto', () => {
      pintar();

      expect(screen.getByRole('button', { name: 'breakdown.gross' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByRole('button', { name: 'breakdown.net' })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it('enseña los números en bruto de partida', () => {
      pintar();

      // 0 de 9 birdies, 4 de 9 bogeys
      expect(screen.getByText(/^0%$/)).toBeInTheDocument();
      expect(screen.getByText('(4)')).toBeInTheDocument();
    });

    it('el interruptor cambia a neto', () => {
      pintar();

      fireEvent.click(screen.getByRole('button', { name: 'breakdown.net' }));

      // En neto hay 2 birdies donde en bruto había 0
      expect(screen.getByText('(2)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'breakdown.net' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('el interruptor no toca el resto del desglose', () => {
      pintar();
      const parAntes = within(screen.getByTestId('par-3')).getByText('+1.00');

      fireEvent.click(screen.getByRole('button', { name: 'breakdown.net' }));

      expect(parAntes).toBeInTheDocument();
    });
  });

  describe('por par', () => {
    it('pinta una fila por cada par que llega, y solo esos', () => {
      pintar();

      expect(screen.getByTestId('par-3')).toBeInTheDocument();
      expect(screen.getByTestId('par-4')).toBeInTheDocument();
      expect(screen.getByTestId('par-5')).toBeInTheDocument();
      expect(screen.queryByTestId('par-6')).toBeNull();
    });

    // El par 6 existe: La Marquesa tiene uno. La API manda solo los pares
    // jugados, así que la pantalla no puede dar por hecho 3-4-5
    it('pinta el par 6 si viene', () => {
      pintar(desglose({ byPar: [{ par: 6, holes: 1, averageToPar: 2 }] }));

      expect(screen.getByTestId('par-6')).toBeInTheDocument();
    });

    it('destaca el par donde más se pierde', () => {
      pintar();

      expect(screen.getByTestId('par-3').className).toContain('rose');
      expect(screen.getByTestId('par-4').className).not.toContain('rose');
    });

    it('no destaca nada cuando solo hay un par', () => {
      pintar(desglose({ byPar: [{ par: 3, holes: 9, averageToPar: 1 }] }));

      expect(screen.getByTestId('par-3').className).not.toContain('rose');
    });

    it('etiqueta la media como POR HOYO', () => {
      pintar();

      expect(
        within(screen.getByTestId('par-3')).getByText('breakdown.perHoleOver:{"count":3}')
      ).toBeInTheDocument();
    });
  });

  describe('ida y vuelta', () => {
    it('enseña la media de la ida', () => {
      pintar();

      expect(within(screen.getByTestId('front-nine')).getByText('+0.11')).toBeInTheDocument();
    });

    // Cero significaría jugar al par, que es un resultado extraordinario
    it('dice que la vuelta no se jugó en vez de pintar un cero', () => {
      pintar();

      const vuelta = screen.getByTestId('back-nine');
      expect(within(vuelta).getByText('breakdown.nineNotPlayed')).toBeInTheDocument();
      expect(within(vuelta).queryByText('0')).toBeNull();
    });

    it('enseña la vuelta cuando sí se jugó', () => {
      pintar(desglose({ backNine: { holes: 9, averageToPar: 0 } }));

      expect(
        within(screen.getByTestId('back-nine')).getByText('playerStats.levelPar')
      ).toBeInTheDocument();
    });
  });

  describe('por campo', () => {
    it('lista los campos con su media', () => {
      pintar();

      expect(screen.getByText('Son Parc - Par 71')).toBeInTheDocument();
      // Un decimal, y en la escala de vuelta
      expect(screen.getByText('+2.0')).toBeInTheDocument();
    });

    // La trampa silenciosa: por campo NO es por hoyo
    it('avisa de que esa media es por vuelta', () => {
      pintar();

      expect(screen.getByText('breakdown.perRoundHint')).toBeInTheDocument();
    });

    it('no pinta la sección sin campos', () => {
      pintar(desglose({ byCourse: [] }));

      expect(screen.queryByText('breakdown.byCourse')).toBeNull();
    });

    it('aguanta un campo sin nombre', () => {
      pintar(
        desglose({
          byCourse: [{ golfCourseId: 'c9', golfCourseName: null, rounds: 2, averageToPar: 5 }],
        })
      );

      expect(screen.getByText('breakdown.unnamedCourse')).toBeInTheDocument();
    });
  });

  describe('cuando falla la carga', () => {
    // No es lo mismo "no tienes vueltas" que "no he podido preguntarlo".
    // Decir lo primero cuando pasa lo segundo es afirmar algo que no consta
    it('lo dice, en vez de asegurar que no hay vueltas', () => {
      render(<ScoringBreakdown breakdown={null} failed />);

      expect(screen.getByTestId('breakdown-error')).toBeInTheDocument();
      expect(screen.queryByTestId('breakdown-empty')).toBeNull();
      expect(screen.queryByText('breakdown.emptyTitle')).toBeNull();
    });

    it('el fallo manda sobre los datos que hubiera', () => {
      render(<ScoringBreakdown breakdown={desglose()} failed />);

      expect(screen.getByTestId('breakdown-error')).toBeInTheDocument();
      expect(screen.queryByTestId('scoring-breakdown')).toBeNull();
    });

    it('tranquiliza sobre el resto de la pantalla', () => {
      render(<ScoringBreakdown breakdown={null} failed />);

      expect(screen.getByText('breakdown.errorDescription')).toBeInTheDocument();
    });
  });

  describe('a quién se señala como el peor par', () => {
    it('no señala a nadie si el jugador está bajo par en todos', () => {
      pintar(
        desglose({
          byPar: [
            { par: 3, holes: 3, averageToPar: -0.5 },
            { par: 5, holes: 2, averageToPar: -0.1 },
          ],
        })
      );

      expect(screen.getByTestId('par-3').className).not.toContain('rose');
      expect(screen.getByTestId('par-5').className).not.toContain('rose');
      expect(screen.queryByText('breakdown.worstPar')).toBeNull();
    });

    it('no señala a nadie si no hay medias', () => {
      pintar(
        desglose({
          byPar: [
            { par: 3, holes: 3, averageToPar: null },
            { par: 4, holes: 4, averageToPar: null },
          ],
        })
      );

      expect(screen.getByTestId('par-3').className).not.toContain('rose');
    });

    it('tampoco al que juega justo al par', () => {
      pintar(
        desglose({
          byPar: [
            { par: 3, holes: 3, averageToPar: 0 },
            { par: 4, holes: 4, averageToPar: -1 },
          ],
        })
      );

      expect(screen.queryByText('breakdown.worstPar')).toBeNull();
    });

    // Solo el color no vale: al sol no se aprecia y un lector de pantalla no lo ve
    it('lo dice con TEXTO, no solo con el color', () => {
      pintar();

      expect(within(screen.getByTestId('par-3')).getByText('breakdown.worstPar')).toBeInTheDocument();
      expect(within(screen.getByTestId('par-4')).queryByText('breakdown.worstPar')).toBeNull();
    });
  });
});
