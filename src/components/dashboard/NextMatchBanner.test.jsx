import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NextMatchBanner from './NextMatchBanner';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options?.opponents ? `${key}:${options.opponents}` : options ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'es' },
  }),
}));

const match = {
  id: 'match-1',
  competitionName: 'Ryder Cup Amigos',
  matchFormat: 'SINGLES',
  roundDate: '2026-08-10',
  sessionType: 'MORNING',
  golfCourseName: 'St Andrews',
  partnerNames: [],
  opponentNames: ['Ana Soto'],
};

const renderBanner = (props = {}) =>
  render(
    <MemoryRouter>
      <NextMatchBanner {...props} />
    </MemoryRouter>
  );

describe('NextMatchBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the tournament and who the match is against', () => {
    renderBanner({ match });

    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('Ryder Cup Amigos');
    expect(screen.getByText('nextMatch.versus:Ana Soto')).toBeInTheDocument();
  });

  it('shows where and when it is played', () => {
    renderBanner({ match });

    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('St Andrews');
    expect(screen.getByTestId('next-match-banner')).toHaveTextContent('nextMatch.session.MORNING');
  });

  it('opens the scoring page for that match', () => {
    renderBanner({ match });

    fireEvent.click(screen.getByTestId('next-match-banner'));

    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/match-1/scoring');
  });

  describe('una partida de stroke play (FE #824, PR 7)', () => {
    const partida = {
      id: 'g-1',
      esPartidaDeFranja: true,
      competitionId: 'c-1',
      competitionName: 'Medal de octubre',
      roundDate: '2026-08-10',
      sessionType: 'MORNING',
      teeTime: '08:10',
      matchNumber: 2,
      partnerNames: ['Ana', 'Bea'],
    };

    it('12 (QA del 11 oct 2026): si le pasaron a esta partida, lo dice con su hora', () => {
      renderBanner({ match: { ...partida, broughtIn: true } });

      expect(screen.getByTestId('next-match-banner')).toHaveTextContent('nextMatch.broughtIn {"numero":2}');
    });

    it('12: si no, no', () => {
      renderBanner({ match: partida });

      expect(screen.getByTestId('next-match-banner')).not.toHaveTextContent('nextMatch.broughtIn');
    });

    it('se nombra como partida, con su hora y sus compañeros', () => {
      renderBanner({ match: partida });

      const banner = screen.getByTestId('next-match-banner');
      expect(banner).toHaveTextContent('nextMatch.teeGroup {"numero":2}');
      expect(banner).toHaveTextContent('Medal de octubre');
      expect(banner).toHaveTextContent('08:10');
      expect(banner).toHaveTextContent('nextMatch.withPartners {"partners":"Ana, Bea"}');
      expect(banner).not.toHaveTextContent('nextMatch.versus');
    });

    it('QA de la release: una compañera retirada, marcada, como en la tarjeta', () => {
      renderBanner({
        match: {
          ...partida,
          partners: [
            { name: 'Ana', withdrawn: true, teeGender: 'FEMALE' },
            { name: 'Bea', withdrawn: false, teeGender: null },
          ],
        },
      });

      expect(screen.getByTestId('next-match-banner').textContent).toContain(
        'upcomingMatches.withdrawnPartner {\\"nombre\\":\\"Ana\\",\\"context\\":\\"female\\"}, Bea'
      );
    });

    it('la cabecera dice «tu próxima partida» (pasada)', () => {
      renderBanner({ match: partida });

      expect(screen.getByTestId('next-match-banner')).toHaveTextContent('nextMatch.labelTeeGroup');
      expect(screen.getByTestId('next-match-banner')).not.toHaveTextContent(/nextMatch\.label$|nextMatch\.label[^T]/);
    });

    it('lleva a anotar su partida, con la competición', () => {
      renderBanner({ match: partida });

      fireEvent.click(screen.getByTestId('next-match-banner'));

      expect(mockNavigate).toHaveBeenCalledWith('/player/groups/g-1/scoring?competition=c-1');
    });
  });

  /**
   * FE #615: sin poder preguntar no se sabe si hay partido. Ofrecer «¿partido
   * improvisado?» ahí es decir que no lo hay, a quien quizá lo tiene en una hora.
   */
  describe('when the matches could not be asked for', () => {
    it('says so instead of offering a quick match', () => {
      renderBanner({ match: null, sinRespuesta: true });

      expect(screen.getByTestId('next-match-sin-respuesta')).toHaveTextContent('nextMatch.sinRespuestaTitle');
      expect(screen.queryByTestId('next-match-empty-cta')).not.toBeInTheDocument();
    });

    it('still shows a match it remembers', () => {
      renderBanner({ match, sinRespuesta: true });

      expect(screen.getByTestId('next-match-banner')).toHaveTextContent('Ryder Cup Amigos');
    });

    it('a remembered match says it may be out of date', () => {
      // Lo mismo que avisa «Mis próximos partidos»: si el calendario cambió, el
      // banner enseña un partido que ya no toca como si fuera el de ahora
      renderBanner({ match, desdeMemoria: true });

      expect(screen.getByTestId('next-match-desde-memoria')).toHaveTextContent('nextMatch.desdeMemoria');
    });

    it('a fresh match does not', () => {
      renderBanner({ match });

      expect(screen.queryByTestId('next-match-desde-memoria')).not.toBeInTheDocument();
    });
  });

  describe('with no match scheduled', () => {
    /**
     * El punto del fallback: la mayoria de la gente no esta metida en un
     * torneo, asi que este seria su estado de siempre. Un hueco en mitad del
     * panel se lee como que algo ha fallado.
     */
    it('turns into the quick match call to action instead of disappearing', () => {
      renderBanner({ match: null });

      expect(screen.getByTestId('next-match-empty-cta')).toBeInTheDocument();
      expect(screen.queryByTestId('next-match-banner')).not.toBeInTheDocument();
    });

    it('starts a quick match when pressed', () => {
      const onCreateQuickMatch = vi.fn();
      renderBanner({ match: null, onCreateQuickMatch });

      fireEvent.click(screen.getByTestId('next-match-empty-cta'));

      expect(onCreateQuickMatch).toHaveBeenCalled();
    });
  });

  it('lets its text shrink instead of pushing the page wider', () => {
    /**
     * Visto en un iPhone: la banda vacia empujaba el ancho mas alla de la
     * pantalla y la pagina entera acababa con scroll horizontal, desplazada.
     * Los elementos fijos (barra inferior, avisos) seguian centrados, que es
     * lo que delataba que era scroll y no un margen.
     *
     * Un hijo flex no encoge por debajo del ancho de su contenido salvo que
     * lleve min-w-0, y el boton es flex-shrink-0.
     */
    renderBanner({ match: null });

    // Cada elemento por su testid: buscar por clase podia dar con el span de
    // fuera o con el boton, y el test seguiria pasando aunque el bloque de
    // texto perdiera su min-w-0
    expect(screen.getByTestId('next-match-empty-content').className).toContain('min-w-0');
    expect(screen.getByTestId('next-match-empty-text').className).toContain('min-w-0');
    // El icono no debe deformarse al encoger el texto
    expect(screen.getByTestId('next-match-empty-icon').className).toContain('flex-shrink-0');
  });

  it('shows a placeholder while loading, not the empty state', () => {
    // Enseñar el CTA de partida rapida antes de saber si hay partido seria
    // decirle que no tiene ninguno sin haberlo comprobado
    renderBanner({ match: null, isLoading: true });

    expect(screen.getByTestId('next-match-banner')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('next-match-empty-cta')).not.toBeInTheDocument();
  });

  it('survives a match with no opponents named', () => {
    renderBanner({ match: { ...match, opponentNames: [] } });

    expect(screen.getByTestId('next-match-banner')).toBeInTheDocument();
  });
});
