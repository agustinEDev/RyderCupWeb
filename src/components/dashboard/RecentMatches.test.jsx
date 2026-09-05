import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RecentMatches from './RecentMatches';
import RecentMatch from '../../domain/entities/RecentMatch';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options.count === 'number') return `${key}:${options.count}`;
      if (options && options.opponents) return `${key}:${options.opponents}`;
      // Los formatos se traducen de verdad: con la clave cruda, una partida
      // llamada como su formato nunca chocaría con él y el test no probaría
      // nada (#575)
      if (key.startsWith('recentMatches.format.')) {
        const formato = key.slice('recentMatches.format.'.length);
        return formato.charAt(0) + formato.slice(1).toLowerCase();
      }
      return key;
    },
    i18n: { language: 'es' },
  }),
}));

const tournamentWin = RecentMatch.fromPersistence({
  id: 'match-1',
  date: '2026-08-01',
  matchFormat: 'SINGLES',
  tournamentName: 'Ryder Cup Amigos',
  golfCourseName: 'St Andrews',
  result: 'WON',
  score: '3&2',
  opponents: ['Ana Soto'],
});

const stablefordRound = RecentMatch.fromPersistence({
  id: 'qm-1',
  date: '2026-08-05',
  scoringFormat: 'STABLEFORD',
  golfCourseName: 'Valderrama',
  stablefordPoints: 34,
});

const excludedRound = RecentMatch.fromPersistence({
  id: 'qm-2',
  date: '2026-08-06',
  scoringFormat: 'STABLEFORD',
  golfCourseName: 'Valderrama',
  stablefordPoints: 30,
  excludedFromStats: true,
});

const renderList = (props = {}) =>
  render(
    <MemoryRouter>
      <RecentMatches {...props} />
    </MemoryRouter>
  );

describe('RecentMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a row per match with its course', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByTestId('recent-match-match-1')).toHaveTextContent('St Andrews');
    expect(screen.getByTestId('recent-match-qm-1')).toHaveTextContent('Valderrama');
  });

  it('names the format, which is what tells two similar rows apart', () => {
    /**
     * Visto en el navegador: tres partidas contra el mismo rival, en el mismo
     * campo y el mismo dia se veian identicas. Lo unico que las distinguia era
     * el marcador, y el formato explica por que uno dice "1UP" y otro "-1".
     */
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByTestId('recent-match-match-1')).toHaveTextContent('Singles');
    expect(screen.getByTestId('recent-match-qm-1')).toHaveTextContent('Stableford');
  });

  it('does not repeat the format when it is already the headline', () => {
    /**
     * Visto en el navegador con una vuelta en solitario: sin rival ni torneo el
     * titular cae al formato, y el subtitulo lo repetia -> "Medal / Medal · St
     * Andrews".
     */
    const soloRound = RecentMatch.fromPersistence({
      id: 'qm-solo',
      scoringFormat: 'MEDAL',
      golfCourseName: 'St Andrews',
      score: 'PAR',
    });

    renderList({ matches: [soloRound] });

    const row = screen.getByTestId('recent-match-qm-solo');
    expect(row.textContent.match(/Medal/g)).toHaveLength(1);
    expect(row).toHaveTextContent('St Andrews');
  });

  // #575: el titular es el NOMBRE de la partida, y el rival baja al subtítulo
  describe('con qué se titula la fila', () => {
    const conNombre = RecentMatch.fromPersistence({
      id: 'qm-named',
      matchFormat: 'FOURBALL',
      matchName: 'Meis Fourball',
      golfCourseName: 'Miño',
      opponents: ['Ana Soto'],
      result: 'WON',
      score: '3&2',
    });

    it('titula la partida rápida con su nombre y deja al rival debajo', () => {
      renderList({ matches: [conNombre] });

      const fila = screen.getByTestId('recent-match-qm-named');
      expect(fila).toHaveTextContent('Meis Fourball');
      expect(fila).toHaveTextContent('recentMatches.versus:Ana Soto');
    });

    it('titula el partido de torneo con su competición, y el rival también baja', () => {
      renderList({ matches: [tournamentWin] });

      const fila = screen.getByTestId('recent-match-match-1');
      expect(fila).toHaveTextContent('Ryder Cup Amigos');
      expect(fila).toHaveTextContent('recentMatches.versus:Ana Soto');
    });

    it('sin nombre, el rival vuelve al titular y no se repite abajo', () => {
      const sinNombre = RecentMatch.fromPersistence({
        id: 'qm-nameless',
        matchFormat: 'SINGLES',
        golfCourseName: 'Miño',
        opponents: ['Ana Soto'],
        result: 'WON',
        score: '3&2',
      });

      renderList({ matches: [sinNombre] });

      const fila = screen.getByTestId('recent-match-qm-nameless');
      expect(fila).toHaveTextContent('Ana Soto');
      expect(fila).not.toHaveTextContent('recentMatches.versus');
    });

    it('una partida llamada como su formato no se queda sin formato abajo', () => {
      // El titular ya no es el formato aunque se lea igual: es un nombre que
      // eligió una persona, y el subtítulo tiene que seguir diciendo a qué se
      // jugó
      const llamadaComoElFormato = RecentMatch.fromPersistence({
        id: 'qm-medal',
        scoringFormat: 'MEDAL',
        matchName: 'Medal',
        golfCourseName: 'Miño',
      });

      renderList({ matches: [llamadaComoElFormato] });

      const fila = screen.getByTestId('recent-match-qm-medal');
      expect(fila.textContent.match(/Medal/g)).toHaveLength(2);
    });

    it('el nombre manda sobre el del torneo cuando llegan los dos', () => {
      // No debería pasar —un partido de torneo no tiene nombre propio—, pero si
      // pasara, lo específico gana a lo general
      const ambos = RecentMatch.fromPersistence({
        id: 'qm-both',
        matchName: 'Meis Fourball',
        tournamentName: 'Ryder Cup Amigos',
        golfCourseName: 'Miño',
      });

      renderList({ matches: [ambos] });

      expect(screen.getByTestId('recent-match-qm-both')).toHaveTextContent('Meis Fourball');
    });
  });

  it('badges a match play result and spells it out for screen readers', () => {
    renderList({ matches: [tournamentWin] });

    expect(screen.getByTestId('result-badge')).toHaveTextContent('recentMatches.resultShort.WON');
    expect(screen.getByText('recentMatches.result.WON')).toBeInTheDocument();
  });

  it('does not badge a round nobody won', () => {
    // Medal y Stableford tienen marcador, pero no rival al que ganar
    renderList({ matches: [stablefordRound] });

    expect(screen.queryByTestId('result-badge')).not.toBeInTheDocument();
  });

  it('shows stableford points as points, and match play as its score', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    expect(screen.getByText('3&2')).toBeInTheDocument();
    expect(screen.getByText('recentMatches.points:34')).toBeInTheDocument();
  });

  it('shows zero stableford points rather than hiding the score', () => {
    const blank = RecentMatch.fromPersistence({ id: 'qm-2', stablefordPoints: 0 });
    renderList({ matches: [blank] });

    expect(screen.getByText('recentMatches.points:0')).toBeInTheDocument();
  });

  it('opens each match where it can be reviewed', () => {
    renderList({ matches: [tournamentWin, stablefordRound] });

    fireEvent.click(screen.getByTestId('recent-match-match-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/match-1/scoring');

    fireEvent.click(screen.getByTestId('recent-match-qm-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  describe('with nothing played yet', () => {
    it('invites the player to start a quick match', () => {
      renderList({ matches: [] });

      expect(screen.getByTestId('recent-matches-empty')).toBeInTheDocument();
    });

    it('starts one when pressed', () => {
      const onCreateQuickMatch = vi.fn();
      renderList({ matches: [], onCreateQuickMatch });

      fireEvent.click(screen.getByTestId('recent-matches-empty-cta'));

      expect(onCreateQuickMatch).toHaveBeenCalled();
    });
  });

  it('shows placeholders while loading, not the empty state', () => {
    renderList({ matches: [], isLoading: true });

    expect(screen.getByTestId('recent-matches')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('recent-matches-empty')).not.toBeInTheDocument();
  });
});

/**
 * La etiqueta se anadio aqui copiando la del historial, pero sin crear su clave:
 * el historial la tiene en `quickMatch.history.excludedBadge` y esta pantalla
 * pide `dashboard.recentMatches.excludedBadge`, que no existia. i18next devuelve
 * la clave cuando falta, asi que en produccion se leia «recentMatches.excludedBadge»
 * dentro de la etiqueta gris. Nadie lo vigilaba.
 */
describe('la marca de partida que no cuenta', () => {
  it('se pinta en las partidas excluidas', () => {
    renderList({ matches: [excludedRound] });
    expect(screen.getByTestId('recent-match-excluded-qm-2')).toBeInTheDocument();
  });

  it('pide exactamente la clave que existe en los locales', () => {
    // Lo que fallo fue justo esto: el componente pedia una clave que nadie habia
    // creado. Con el mock de i18n devolviendo la clave tal cual, esto ata la
    // cadena entera —componente y JSON— en vez de comprobar cada extremo aparte
    renderList({ matches: [excludedRound] });
    expect(screen.getByText('recentMatches.excludedBadge')).toBeInTheDocument();
  });

  it('no se pinta en las que si cuentan', () => {
    renderList({ matches: [stablefordRound] });
    expect(screen.queryByTestId('recent-match-excluded-qm-1')).not.toBeInTheDocument();
  });

  it('su texto existe en los dos idiomas, no es la clave en crudo', async () => {
    const es = (await import('../../i18n/locales/es/dashboard.json')).default;
    const en = (await import('../../i18n/locales/en/dashboard.json')).default;

    // Se comprueba el TEXTO, no que haya algo: con `toBeTruthy` bastaba con que
    // el JSON contuviera la propia clave para pasar, que es el fallo que esto
    // viene a vigilar
    expect(es.recentMatches?.excludedBadge).toBe('No cuenta');
    expect(en.recentMatches?.excludedBadge).toBe('Not counted');
  });
});
