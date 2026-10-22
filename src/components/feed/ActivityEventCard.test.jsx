import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import feedEs from '../../i18n/locales/es/feed.json';
import feedEn from '../../i18n/locales/en/feed.json';
import ActivityEventCard from './ActivityEventCard';

vi.mock('../ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

// Jueves 22 de octubre de 2026, 18:00
const AHORA = new Date(2026, 9, 22, 18, 0);
const YO = 'me';

const AUTORES = {
  me: { id: 'me', displayName: 'Agus' },
  u2: { id: 'u2', displayName: 'Pedro' },
  u3: { id: 'u3', displayName: 'Xavi' },
};
const CAMPOS = { c1: 'El Saler' };

const instancias = {};
beforeAll(async () => {
  for (const lng of ['es', 'en']) {
    const i = i18next.createInstance();
    await i.use(initReactI18next).init({
      lng,
      fallbackLng: 'es',
      ns: ['feed'],
      defaultNS: 'feed',
      resources: { es: { feed: feedEs }, en: { feed: feedEn } },
      interpolation: { escapeValue: false },
    });
    instancias[lng] = i;
  }
});

const evento = (overrides = {}) => ({
  id: 'e1',
  userId: YO,
  type: 'QUICK_MATCH_FINISHED',
  occurredAt: new Date(2026, 9, 22, 12, 0),
  publishedAt: new Date(2026, 9, 22, 17, 55),
  payload: {},
  sourceMatchId: 'm1',
  groupKey: 'g1',
  ...overrides,
});

const tarjeta = (eventos, overrides = {}) => {
  const lista = Array.isArray(eventos) ? eventos : [eventos];
  return {
    clave: lista[0].groupKey || lista[0].id,
    tipo: lista[0].type,
    autorId: lista[0].userId,
    eventos: lista,
    instante: lista[0].publishedAt,
    nueva: false,
    ...overrides,
  };
};

const pinta = (t, { lng = 'es', autores = AUTORES, campos = CAMPOS, ahora = AHORA } = {}) =>
  render(
    <I18nextProvider i18n={instancias[lng]}>
      <MemoryRouter>
        <ActivityEventCard tarjeta={t} autores={autores} campos={campos} yoId={YO} ahora={ahora} />
      </MemoryRouter>
    </I18nextProvider>
  );

const frase = () => screen.getByTestId('frase-tarjeta').textContent;
const enlaceDeLaTarjeta = () => screen.queryByTestId('enlace-tarjeta');

const qm = (payload, overrides = {}) =>
  tarjeta(evento({ type: 'QUICK_MATCH_FINISHED', payload: { golf_course_id: 'c1', ...payload }, ...overrides }));

describe('ActivityEventCard — texts (case 10)', () => {
  it('own Stableford with position: «Acabaste 2.º de 4 en El Saler · 34 puntos (88 golpes)»', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, tied: false, total_players: 4, points: 34, gross_strokes: 88 }));

    expect(frase()).toBe('Acabaste 2.º de 4 en El Saler · 34 puntos (88 golpes)');
  });

  it('own Medal: «72 netos (84 golpes)»', () => {
    pinta(
      qm({ scoring_format: 'MEDAL', position: 3, tied: false, total_players: 5, net_strokes: 72, gross_strokes: 84, to_par: 0 })
    );

    expect(frase()).toBe('Acabaste 3.º de 5 en El Saler · 72 netos (84 golpes)');
  });

  it('a shared position: «1.º (empatado)»', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 1, tied: true, total_players: 3, points: 36, gross_strokes: 80 }));

    expect(frase()).toBe('Acabaste 1.º (empatado) de 3 en El Saler · 36 puntos (80 golpes)');
  });

  it('the «Mejor bruto del grupo» tag only when the payload says so', () => {
    const { unmount } = pinta(
      qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 30, gross_strokes: 79, best_gross_in_group: true })
    );
    expect(screen.getByText('Mejor bruto del grupo')).toBeInTheDocument();
    unmount();

    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 30, gross_strokes: 79 }));
    expect(screen.queryByText('Mejor bruto del grupo')).not.toBeInTheDocument();
  });

  it('single player, no position: «Acabaste la partida rápida en El Saler con 34 puntos»', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 34, gross_strokes: 88 }));

    expect(frase()).toBe('Acabaste la partida rápida en El Saler con 34 puntos');
  });

  it('single player in Medal', () => {
    pinta(qm({ scoring_format: 'MEDAL', position: null, total_players: 1, net_strokes: 70, gross_strokes: 82 }));

    expect(frase()).toBe('Acabaste la partida rápida en El Saler con 70 netos');
  });

  it('without the course name it still says how it went', () => {
    pinta(
      qm({ golf_course_id: 'c-borrado', scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 34, gross_strokes: 88 })
    );

    expect(frase()).toBe('Acabaste 2.º de 4 · 34 puntos (88 golpes)');
  });

  it('one point is singular', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 1, gross_strokes: 120 }));

    expect(frase()).toBe('Acabaste la partida rápida en El Saler con 1 punto');
  });

  it('own match play won: «Ganaste 3&2 a Pedro», Pedro links to his profile', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'WON', score: '3&2', opponents: [{ user_id: 'u2', name: null }] }));

    expect(frase()).toBe('Ganaste 3&2 a Pedro');
    expect(within(screen.getByTestId('frase-tarjeta')).getByRole('link', { name: 'Pedro' })).toHaveAttribute(
      'href',
      '/players/u2'
    );
  });

  it('own match play lost to a guest: «Perdiste 2&1 con Xisco», no link for the guest', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'LOST', score: '2&1', opponents: [{ user_id: null, name: 'Xisco' }] }));

    expect(frase()).toBe('Perdiste 2&1 con Xisco');
    expect(within(screen.getByTestId('frase-tarjeta')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('own match play halved: «Empataste con Pedro»', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'HALVED', score: 'AS', opponents: [{ user_id: 'u2', name: null }] }));

    expect(frase()).toBe('Empataste con Pedro');
  });

  it('two rivals are joined: «Perdiste 2&1 con Pedro y Xavi»', () => {
    pinta(
      qm({
        match_format: 'FOURBALL',
        outcome: 'LOST',
        score: '2&1',
        opponents: [
          { user_id: 'u2', name: null },
          { user_id: 'u3', name: null },
        ],
      })
    );

    expect(frase()).toBe('Perdiste 2&1 con Pedro y Xavi');
  });

  it("friend's quick match: «Pedro acabó 2.º con 31 puntos»", () => {
    pinta(
      qm(
        { scoring_format: 'STABLEFORD', position: 2, tied: false, total_players: 4, points: 31, gross_strokes: 90 },
        { userId: 'u2' }
      )
    );

    expect(frase()).toBe('Pedro acabó 2.º con 31 puntos');
    expect(within(screen.getByTestId('frase-tarjeta')).getByRole('link', { name: 'Pedro' })).toHaveAttribute(
      'href',
      '/players/u2'
    );
  });

  it("friend's quick match alone and in Medal", () => {
    const { unmount } = pinta(
      qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 29 }, { userId: 'u2' })
    );
    expect(frase()).toBe('Pedro acabó la partida rápida con 29 puntos');
    unmount();

    pinta(qm({ scoring_format: 'MEDAL', position: 1, tied: true, total_players: 2, net_strokes: 71 }, { userId: 'u2' }));
    expect(frase()).toBe('Pedro acabó 1.º (empatado) con 71 netos');
  });

  it.each([
    ['WON', '3&2', 'Pedro ganó 3&2'],
    ['LOST', '2&1', 'Pedro perdió 2&1'],
    ['HALVED', 'AS', 'Pedro empató'],
  ])("friend's match play %s: «%s»", (outcome, score, texto) => {
    pinta(qm({ match_format: 'SINGLES', outcome, score, opponents: [{ user_id: 'me', name: null }] }, { userId: 'u2' }));

    expect(frase()).toBe(texto);
  });

  it('tournament match result: «Ganaste 3&2 a Pedro» / «Perdiste 2&1 con Pedro y Xavi» / «Empataste con Pedro»', () => {
    const resultado = (payload) =>
      tarjeta(evento({ type: 'TOURNAMENT_MATCH_RESULT', payload: { competition_id: 'c-1', competition_name: 'Ryder Otoño', ...payload } }));

    const a = pinta(resultado({ outcome: 'WON', score: '3&2', opponent_ids: ['u2'] }));
    expect(frase()).toBe('Ganaste 3&2 a Pedro');
    a.unmount();

    const b = pinta(resultado({ outcome: 'LOST', score: '2&1', opponent_ids: ['u2', 'u3'] }));
    expect(frase()).toBe('Perdiste 2&1 con Pedro y Xavi');
    b.unmount();

    pinta(resultado({ outcome: 'HALVED', score: 'AS', opponent_ids: ['u2'] }));
    expect(frase()).toBe('Empataste con Pedro');
  });

  it('a conceded or walkover result reads as words, not as a code', () => {
    const resultado = (score) =>
      tarjeta(
        evento({
          type: 'TOURNAMENT_MATCH_RESULT',
          payload: { competition_id: 'c-1', competition_name: 'R', outcome: 'WON', score, opponent_ids: ['u2'] },
        })
      );

    const a = pinta(resultado('CONCEDED'));
    expect(frase()).toBe('Ganaste por concesión a Pedro');
    a.unmount();

    pinta(resultado('W/O'));
    expect(frase()).toBe('Ganaste por incomparecencia a Pedro');
  });

  it('a rival who is no longer in the authors reads as «un jugador», without a link', () => {
    pinta(
      tarjeta(
        evento({
          type: 'TOURNAMENT_MATCH_RESULT',
          payload: { competition_id: 'c-1', outcome: 'WON', score: '1UP', opponent_ids: ['u404'] },
        })
      )
    );

    expect(frase()).toBe('Ganaste 1UP a un jugador');
    expect(within(screen.getByTestId('frase-tarjeta')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('a guest without a name reads as «un invitado» (review FE-1)', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'WON', score: '2UP', opponents: [{ user_id: null, name: null }] }));

    expect(frase()).toBe('Ganaste 2UP a un invitado');
  });

  it('an author missing from the authors reads as «un jugador» (review FE-1)', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'WON', score: '2UP', opponents: [] }, { userId: 'u404' }));

    expect(frase()).toBe('un jugador ganó 2UP');
  });

  it('English: «a guest» and «a player»', () => {
    const a = pinta(qm({ match_format: 'SINGLES', outcome: 'WON', score: '2UP', opponents: [{ user_id: null, name: null }] }), { lng: 'en' });
    expect(frase()).toBe('You won 2UP against a guest');
    a.unmount();

    pinta(qm({ match_format: 'SINGLES', outcome: 'LOST', score: '2&1', opponents: [{ user_id: 'u404' }] }), { lng: 'en' });
    expect(frase()).toBe('You lost 2&1 to a player');
  });

  it('final standing: «Clasificación final de Ryder Otoño: 4.º de 16»', () => {
    pinta(
      tarjeta(
        evento({
          type: 'TOURNAMENT_FINAL_STANDING',
          payload: { competition_id: 'c-1', competition_name: 'Ryder Otoño', position: 4, tied: false, total_players: 16 },
        })
      )
    );

    expect(frase()).toBe('Clasificación final de Ryder Otoño: 4.º de 16');
  });

  it('final standing tied, and without a position', () => {
    const a = pinta(
      tarjeta(
        evento({
          type: 'TOURNAMENT_FINAL_STANDING',
          payload: { competition_id: 'c-1', competition_name: 'R', position: 2, tied: true, total_players: 8 },
        })
      )
    );
    expect(frase()).toBe('Clasificación final de R: 2.º (empatado) de 8');
    a.unmount();

    pinta(
      tarjeta(
        evento({
          type: 'TOURNAMENT_FINAL_STANDING',
          payload: { competition_id: 'c-1', competition_name: 'R', position: null, total_players: 8, status: 'NR' },
        })
      )
    );
    expect(frase()).toBe('Clasificación final de R: sin puesto');
  });

  it.each([
    ['ENROLLMENT_APPROVED', 'Te han aceptado en Ryder Otoño'],
    ['INVITED_TO_TOURNAMENT', 'Te han invitado a Ryder Otoño'],
    ['ENROLLMENT_REQUEST_CLOSED', 'Tu solicitud a Ryder Otoño se cerró sin plaza'],
    ['ENROLLMENT_REJECTED', 'El organizador no aceptó tu solicitud a Ryder Otoño'],
  ])('enrolment notice %s: «%s»', (type, texto) => {
    pinta(
      tarjeta(
        evento({
          type,
          payload: { competition_id: 'c-1', competition_name: 'Ryder Otoño', start_date: '2026-11-14', end_date: '2026-11-15' },
        })
      )
    );

    expect(frase()).toBe(texto);
  });

  it('friend enrolled: «Pedro se ha apuntado al torneo Ryder Otoño (14–15 nov)»', () => {
    pinta(
      tarjeta(
        evento({
          type: 'ENROLLED_IN_TOURNAMENT',
          userId: 'u2',
          payload: { competition_id: 'c-1', competition_name: 'Ryder Otoño', start_date: '2026-11-14', end_date: '2026-11-15' },
        })
      )
    );

    expect(frase()).toBe('Pedro se ha apuntado al torneo Ryder Otoño (14–15 nov)');
    expect(within(screen.getByTestId('frase-tarjeta')).getByRole('link', { name: 'Pedro' })).toHaveAttribute(
      'href',
      '/players/u2'
    );
  });

  it('friend enrolled in a one-day tournament, and without dates', () => {
    const a = pinta(
      tarjeta(
        evento({
          type: 'ENROLLED_IN_TOURNAMENT',
          userId: 'u2',
          payload: { competition_id: 'c-1', competition_name: 'R', start_date: '2026-11-14', end_date: '2026-11-14' },
        })
      )
    );
    expect(frase()).toBe('Pedro se ha apuntado al torneo R (14 nov)');
    a.unmount();

    pinta(tarjeta(evento({ type: 'ENROLLED_IN_TOURNAMENT', userId: 'u2', payload: { competition_id: 'c-1', competition_name: 'R' } })));
    expect(frase()).toBe('Pedro se ha apuntado al torneo R');
  });

  it('several achievements of one round on one card, with their counts (case 9)', () => {
    pinta(
      tarjeta(
        [
          evento({ id: 'b', type: 'BIRDIE', userId: 'u2', groupKey: 'u2:m1', payload: { count: 3, holes: [1, 5, 9], golf_course_id: 'c1' } }),
          evento({ id: 'e', type: 'EAGLE_OR_BETTER', userId: 'u2', groupKey: 'u2:m1', payload: { count: 1, holes: [12], golf_course_id: 'c1' } }),
        ]
      )
    );

    const tarjetaPintada = screen.getByTestId('activity-event-u2:m1');
    expect(tarjetaPintada).toHaveTextContent('3 birdies');
    expect(tarjetaPintada).toHaveTextContent('Un eagle');
    expect(tarjetaPintada).toHaveTextContent('El Saler');
    expect(within(tarjetaPintada).getByRole('link', { name: 'Pedro' })).toHaveAttribute('href', '/players/u2');
  });
});

describe('ActivityEventCard — time and new mark (cases 7, 8)', () => {
  const conInstante = (instante, extra = {}) =>
    pinta(tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_id: 'c-1', competition_name: 'R' } }), { instante, ...extra }));

  it('today, minutes: «hace 5 min»', () => {
    conInstante(new Date(2026, 9, 22, 17, 55));
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent('hace 5 min');
  });

  it('today, hours: «hace 2 h»', () => {
    conInstante(new Date(2026, 9, 22, 15, 30));
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent('hace 2 h');
  });

  it('just now', () => {
    conInstante(new Date(2026, 9, 22, 17, 59, 40));
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent('ahora');
  });

  it('another day: the clock time «18:30»', () => {
    conInstante(new Date(2026, 9, 20, 18, 30));
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent('18:30');
  });

  it('another day in English is 24-hour too: «18:30» (review FE-1)', () => {
    pinta(
      tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_id: 'c-1', competition_name: 'R' } }), {
        instante: new Date(2026, 9, 20, 18, 30),
      }),
      { lng: 'en' }
    );
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent(/^18:30$/);
  });

  it('a morning time keeps two digits: «07:05»', () => {
    pinta(
      tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_id: 'c-1', competition_name: 'R' } }), {
        instante: new Date(2026, 9, 20, 7, 5),
      }),
      { lng: 'en' }
    );
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent(/^07:05$/);
  });

  it('carries the «Nuevo» mark only when new', () => {
    const a = conInstante(new Date(2026, 9, 22, 17, 55), { nueva: true });
    expect(screen.getByTestId('marca-nueva')).toHaveTextContent('Nuevo');
    a.unmount();

    conInstante(new Date(2026, 9, 22, 17, 55), { nueva: false });
    expect(screen.queryByTestId('marca-nueva')).not.toBeInTheDocument();
  });
});

describe('ActivityEventCard — where a tap goes (case 12)', () => {
  it('own quick match result → the quick match', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 34, gross_strokes: 88 }));
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/quick-matches/m1/scoring');
  });

  it('tournament match result → the competition match', () => {
    pinta(
      tarjeta(
        evento({ type: 'TOURNAMENT_MATCH_RESULT', sourceMatchId: 'mt', payload: { competition_id: 'c-1', outcome: 'WON', score: '3&2', opponent_ids: ['u2'] } })
      )
    );
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/player/matches/mt/scoring');
  });

  it('own quick match achievement → the quick match; own tournament achievement → the competition match', () => {
    const a = pinta(tarjeta(evento({ type: 'BIRDIE', userId: YO, sourceMatchId: 'mq', payload: { count: 1 } })));
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/quick-matches/mq/scoring');
    a.unmount();

    pinta(tarjeta(evento({ type: 'BIRDIE', userId: YO, sourceMatchId: 'mt', payload: { count: 1, from_tournament: true } })));
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/player/matches/mt/scoring');
  });

  describe('somebody else\'s match: only if you played it, otherwise their profile', () => {
    it.each([
      { caso: 'quick match achievement', datos: { type: 'BIRDIE', sourceMatchId: 'mq', payload: { count: 1 } } },
      { caso: 'tournament achievement', datos: { type: 'BIRDIE', sourceMatchId: 'mt', payload: { count: 1, from_tournament: true } } },
      {
        caso: 'stroke play quick match',
        datos: { type: 'QUICK_MATCH_FINISHED', sourceMatchId: 'mq', payload: { scoring_format: 'STABLEFORD', position: 1, total_players: 3, points: 30 } },
      },
      {
        caso: 'match play quick match without you',
        datos: { type: 'QUICK_MATCH_FINISHED', sourceMatchId: 'mq', payload: { match_format: 'SINGLES', outcome: 'WON', score: '3&2', opponents: [{ user_id: 'u3' }, { user_id: null, name: 'Invitado' }] } },
      },
    ])("a friend's $caso → the friend's profile", ({ datos }) => {
      pinta(tarjeta(evento({ userId: 'u2', ...datos })));
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/players/u2');
    });

    it("no profile link when the friend is missing from the authors (review FE-1)", () => {
      pinta(tarjeta(evento({ type: 'BIRDIE', userId: 'u404', sourceMatchId: 'mq', payload: { count: 1 } })));
      expect(enlaceDeLaTarjeta()).not.toBeInTheDocument();
    });

    it("on that friend's own profile, no card link to the page already open (CodeRabbit #944)", () => {
      render(
        <I18nextProvider i18n={instancias.es}>
          <MemoryRouter>
            <ActivityEventCard
              tarjeta={tarjeta(evento({ type: 'BIRDIE', userId: 'u2', sourceMatchId: 'mq', payload: { count: 1 } }))}
              autores={AUTORES}
              yoId={YO}
              perfilActualId="u2"
              ahora={AHORA}
            />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(enlaceDeLaTarjeta()).not.toBeInTheDocument();
    });

    it("on that profile, a match the viewer played still links to the match, and other people's names to theirs", () => {
      render(
        <I18nextProvider i18n={instancias.es}>
          <MemoryRouter>
            <ActivityEventCard
              tarjeta={tarjeta(
                evento({
                  userId: 'u2',
                  sourceMatchId: 'mq',
                  payload: { match_format: 'FOURBALL', outcome: 'WON', score: '1UP', partners: [{ user_id: YO }], opponents: [{ user_id: 'u3' }] },
                })
              )}
              autores={AUTORES}
              yoId={YO}
              perfilActualId="u2"
              ahora={AHORA}
            />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/quick-matches/mq/scoring');
    });

    it("a friend's quick match where you were the rival → the quick match", () => {
      pinta(
        tarjeta(
          evento({
            userId: 'u2',
            sourceMatchId: 'mq',
            payload: { match_format: 'SINGLES', outcome: 'WON', score: '3&2', opponents: [{ user_id: YO }] },
          })
        )
      );
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/quick-matches/mq/scoring');
    });

    it("a friend's quick match where you were the partner → the quick match", () => {
      pinta(
        tarjeta(
          evento({
            userId: 'u2',
            sourceMatchId: 'mq',
            payload: { match_format: 'FOURBALL', outcome: 'LOST', score: '1UP', partners: [{ user_id: YO }], opponents: [{ user_id: 'u3' }] },
          })
        )
      );
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/quick-matches/mq/scoring');
    });

    it('without knowing who is looking, no match link: the profile', () => {
      render(
        <I18nextProvider i18n={instancias.es}>
          <MemoryRouter>
            <ActivityEventCard
              tarjeta={tarjeta(evento({ type: 'BIRDIE', userId: 'u2', sourceMatchId: 'mq', payload: { count: 1 } }))}
              autores={AUTORES}
              ahora={AHORA}
            />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/players/u2');
    });

    it('without knowing who is looking, a rival with no id does not count as you', () => {
      render(
        <I18nextProvider i18n={instancias.es}>
          <MemoryRouter>
            <ActivityEventCard
              tarjeta={tarjeta(
                evento({
                  userId: 'u2',
                  sourceMatchId: 'mq',
                  payload: { match_format: 'SINGLES', outcome: 'WON', score: '3&2', opponents: [{ name: 'Invitado' }] },
                })
              )}
              autores={AUTORES}
              ahora={AHORA}
            />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/players/u2');
    });
  });

  it.each([
    'ENROLLMENT_APPROVED',
    'INVITED_TO_TOURNAMENT',
    'ENROLLMENT_REQUEST_CLOSED',
    'ENROLLMENT_REJECTED',
    'ENROLLED_IN_TOURNAMENT',
    'TOURNAMENT_FINAL_STANDING',
  ])('%s → the competition', (type) => {
    pinta(tarjeta(evento({ type, userId: type === 'ENROLLED_IN_TOURNAMENT' ? 'u2' : YO, payload: { competition_id: 'c-1', competition_name: 'R' } })));
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/competitions/c-1');
  });

  it('no link when the ids are missing', () => {
    const a = pinta(tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_name: 'R' } })));
    expect(enlaceDeLaTarjeta()).not.toBeInTheDocument();
    a.unmount();

    pinta(qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 3 }, { sourceMatchId: null }));
    expect(enlaceDeLaTarjeta()).not.toBeInTheDocument();
  });

  it('the card link is named after its sentence for screen readers', () => {
    pinta(
      tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_id: 'c-1', competition_name: 'Ryder Otoño' } }))
    );
    expect(enlaceDeLaTarjeta()).toHaveAccessibleName('Te han aceptado en Ryder Otoño');
  });

  it("a friend's avatar links to the friend", () => {
    pinta(tarjeta(evento({ type: 'BIRDIE', userId: 'u2', payload: { count: 1 } })));
    expect(screen.getByTestId('avatar-u2').closest('a')).toHaveAttribute('href', '/players/u2');
  });
});

describe('ActivityEventCard — English (case 16)', () => {
  it('own ranked quick match', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 34, gross_strokes: 88 }), { lng: 'en' });
    expect(frase()).toBe('You finished 2nd of 4 at El Saler · 34 points (88 strokes)');
  });

  it('ordinals 1st, 3rd, 11th, 22nd', () => {
    const casos = [
      [1, '1st'],
      [3, '3rd'],
      [11, '11th'],
      [22, '22nd'],
    ];
    for (const [position, texto] of casos) {
      const r = pinta(
        tarjeta(
          evento({
            type: 'TOURNAMENT_FINAL_STANDING',
            payload: { competition_id: 'c-1', competition_name: 'R', position, total_players: 30 },
          })
        ),
        { lng: 'en' }
      );
      expect(frase()).toBe(`Final standings of R: ${texto} of 30`);
      r.unmount();
    }
  });

  it('match play and friends', () => {
    const a = pinta(qm({ match_format: 'SINGLES', outcome: 'WON', score: '3&2', opponents: [{ user_id: 'u2' }] }), { lng: 'en' });
    expect(frase()).toBe('You won 3&2 against Pedro');
    a.unmount();

    const b = pinta(
      qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 31 }, { userId: 'u2' }),
      { lng: 'en' }
    );
    expect(frase()).toBe('Pedro finished 2nd with 31 points');
    b.unmount();

    conTiempoEn();
  });

  const conTiempoEn = () => {
    pinta(tarjeta(evento({ type: 'ENROLLMENT_APPROVED', payload: { competition_id: 'c-1', competition_name: 'R' } }), { instante: new Date(2026, 9, 22, 17, 55) }), { lng: 'en' });
    expect(screen.getByTestId('hora-tarjeta')).toHaveTextContent('5 min ago');
    expect(frase()).toBe('You were accepted into R');
  };
});

describe('ActivityEventCard — enrollment confirmed and tee times (social decisions, case 1)', () => {
  const CON_RIVALES = {
    ...AUTORES,
    u4: { id: 'u4', displayName: 'Juan' },
    u5: { id: 'u5', displayName: 'Luis' },
  };

  const inscrito = (payload = {}) =>
    tarjeta(
      evento({
        type: 'ENROLLMENT_CONFIRMED',
        sourceMatchId: 'c-1',
        groupKey: null,
        payload: {
          competition_id: 'c-1',
          competition_name: 'Ryder Otoño',
          start_date: '2026-11-14',
          end_date: '2026-11-15',
          ...payload,
        },
      })
    );

  // Sábado 24 de octubre de 2026
  const salida = (payload = {}) =>
    tarjeta(
      evento({
        type: 'TEE_TIME_ASSIGNED',
        sourceMatchId: 'r-1',
        groupKey: null,
        payload: {
          competition_id: 'c-1',
          competition_name: 'Ryder Otoño',
          start_date: '2026-10-24',
          end_date: '2026-10-25',
          round_id: 'r-1',
          round_date: '2026-10-24',
          session_type: 'MORNING',
          kind: 'TEE_GROUP',
          tee_time: '09:10',
          partner_ids: ['u2', 'u3'],
          opponent_ids: [],
          match_id: null,
          changed: false,
          ...payload,
        },
      })
    );

  const partido = (payload = {}) =>
    salida({ kind: 'MATCH', tee_time: null, partner_ids: ['u2'], opponent_ids: ['u4', 'u5'], match_id: 'mt-1', ...payload });

  it('enrolled: «Te has inscrito en Ryder Otoño» / «You signed up for Ryder Otoño», and a tap goes to the tournament', () => {
    const a = pinta(inscrito());
    expect(frase()).toBe('Te has inscrito en Ryder Otoño');
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/competitions/c-1');
    a.unmount();

    pinta(inscrito(), { lng: 'en' });
    expect(frase()).toBe('You signed up for Ryder Otoño');
  });

  it('enrolled without a name reads «un torneo»', () => {
    pinta(inscrito({ competition_name: null }));
    expect(frase()).toBe('Te has inscrito en un torneo');
  });

  it('stroke play tee time: «Ya tienes salida en Ryder Otoño: sáb 24 oct · 9:10 · con Pedro y Xavi»', () => {
    pinta(salida());

    expect(frase()).toBe('Ya tienes salida en Ryder Otoño: sáb 24 oct · 9:10 · con Pedro y Xavi');
    const enFrase = within(screen.getByTestId('frase-tarjeta'));
    expect(enFrase.getByRole('link', { name: 'Pedro' })).toHaveAttribute('href', '/players/u2');
    expect(enFrase.getByRole('link', { name: 'Xavi' })).toHaveAttribute('href', '/players/u3');
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/competitions/c-1');
  });

  it('stroke play tee time in English', () => {
    pinta(salida(), { lng: 'en' });
    expect(frase()).toBe('You have a tee time in Ryder Otoño: Sat, Oct 24 · 9:10 · with Pedro and Xavi');
  });

  it('keeps an afternoon time as it is: «14:30»', () => {
    pinta(salida({ tee_time: '14:30', session_type: 'AFTERNOON' }));
    expect(frase()).toBe('Ya tienes salida en Ryder Otoño: sáb 24 oct · 14:30 · con Pedro y Xavi');
  });

  it('alone in the group: no «con …»', () => {
    pinta(salida({ partner_ids: [] }));
    expect(frase()).toBe('Ya tienes salida en Ryder Otoño: sáb 24 oct · 9:10');
  });

  it('without a time, the session instead', () => {
    pinta(salida({ tee_time: null }));
    expect(frase()).toBe('Ya tienes salida en Ryder Otoño: sáb 24 oct, mañana · con Pedro y Xavi');
  });

  it('Ryder fourball: «Ya tienes partido en Ryder Otoño: sáb 24 oct, mañana · con Pedro contra Juan y Luis»', () => {
    pinta(partido(), { autores: CON_RIVALES });

    expect(frase()).toBe('Ya tienes partido en Ryder Otoño: sáb 24 oct, mañana · con Pedro contra Juan y Luis');
    const enFrase = within(screen.getByTestId('frase-tarjeta'));
    expect(enFrase.getByRole('link', { name: 'Juan' })).toHaveAttribute('href', '/players/u4');
    expect(enFrase.getByRole('link', { name: 'Luis' })).toHaveAttribute('href', '/players/u5');
    expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/competitions/c-1');
  });

  it('Ryder fourball in English', () => {
    pinta(partido(), { autores: CON_RIVALES, lng: 'en' });
    expect(frase()).toBe(
      'You have a match in Ryder Otoño: Sat, Oct 24, morning · with Pedro against Juan and Luis'
    );
  });

  it('Ryder singles: «contra Juan», in the afternoon and in the evening', () => {
    const a = pinta(partido({ partner_ids: [], opponent_ids: ['u4'], session_type: 'AFTERNOON' }), { autores: CON_RIVALES });
    expect(frase()).toBe('Ya tienes partido en Ryder Otoño: sáb 24 oct, tarde · contra Juan');
    a.unmount();

    const b = pinta(partido({ partner_ids: [], opponent_ids: ['u4'], session_type: 'EVENING' }), {
      autores: CON_RIVALES,
      lng: 'en',
    });
    expect(frase()).toBe('You have a match in Ryder Otoño: Sat, Oct 24, evening · against Juan');
    b.unmount();
  });

  it('a Ryder match with a time says both', () => {
    pinta(partido({ tee_time: '08:30' }), { autores: CON_RIVALES });
    expect(frase()).toBe('Ya tienes partido en Ryder Otoño: sáb 24 oct, mañana · 8:30 · con Pedro contra Juan y Luis');
  });

  it('changed: «Ha cambiado tu salida en …» / «Ha cambiado tu partido en …»', () => {
    const a = pinta(salida({ changed: true }));
    expect(frase()).toBe('Ha cambiado tu salida en Ryder Otoño: sáb 24 oct · 9:10 · con Pedro y Xavi');
    a.unmount();

    const b = pinta(partido({ changed: true }), { autores: CON_RIVALES });
    expect(frase()).toBe('Ha cambiado tu partido en Ryder Otoño: sáb 24 oct, mañana · con Pedro contra Juan y Luis');
    b.unmount();
  });

  it('changed in English', () => {
    const a = pinta(salida({ changed: true }), { lng: 'en' });
    expect(frase()).toBe('Your tee time in Ryder Otoño has changed: Sat, Oct 24 · 9:10 · with Pedro and Xavi');
    a.unmount();

    const b = pinta(partido({ changed: true }), { autores: CON_RIVALES, lng: 'en' });
    expect(frase()).toBe(
      'Your match in Ryder Otoño has changed: Sat, Oct 24, morning · with Pedro against Juan and Luis'
    );
    b.unmount();
  });

  it('somebody missing from the authors (blocked, inactive) reads «un jugador», without a link', () => {
    pinta(partido({ opponent_ids: ['u4', 'u-bloqueado'] }), { autores: CON_RIVALES });

    expect(frase()).toBe('Ya tienes partido en Ryder Otoño: sáb 24 oct, mañana · con Pedro contra Juan y un jugador');
    expect(within(screen.getByTestId('frase-tarjeta')).queryByRole('link', { name: 'un jugador' })).toBeNull();
  });

  it('without a round date it still says where', () => {
    pinta(salida({ round_date: null, tee_time: null, session_type: null, partner_ids: [] }));
    expect(frase()).toBe('Ya tienes salida en Ryder Otoño');
  });

  it('long names wrap instead of pushing the card sideways', () => {
    pinta(
      partido({ partner_ids: ['u2'], opponent_ids: ['u4', 'u5'] }),
      {
        autores: {
          u2: { id: 'u2', displayName: 'Maximiliano Fernández-Villaverde de la Concepción' },
          u4: { id: 'u4', displayName: 'Bartolomé Rodríguez-Zapatero y Altamirano' },
          u5: { id: 'u5', displayName: 'Guillermina Echeverría-Santisteban' },
        },
      }
    );
    expect(screen.getByTestId('frase-tarjeta').className).toMatch(/break-words/);
  });
});

describe('ActivityEventCard — unfinished quick matches and holes (social decisions, cases 2, 3)', () => {
  it('own match play unfinished: «Partida rápida sin terminar contra Pedro», never won or halved', () => {
    const a = pinta(
      qm({ match_format: 'SINGLES', outcome: 'UNFINISHED', score: null, unfinished: true, holes_played: 7, opponents: [{ user_id: 'u2' }] })
    );
    expect(frase()).toBe('Partida rápida sin terminar contra Pedro');
    a.unmount();

    pinta(
      qm({ match_format: 'SINGLES', outcome: 'UNFINISHED', score: null, unfinished: true, holes_played: 0, opponents: [{ user_id: 'u2' }] }),
      { lng: 'en' }
    );
    expect(frase()).toBe('Unfinished quick match against Pedro');
  });

  it('the «unfinished» flag alone is enough, whatever the outcome says', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'HALVED', score: null, unfinished: true, opponents: [{ user_id: 'u2' }] }));
    expect(frase()).toBe('Partida rápida sin terminar contra Pedro');
  });

  it('the UNFINISHED outcome alone is enough too', () => {
    pinta(qm({ match_format: 'SINGLES', outcome: 'UNFINISHED', score: null, opponents: [{ user_id: 'u2' }] }));
    expect(frase()).toBe('Partida rápida sin terminar contra Pedro');
  });

  it("a friend's unfinished match play: «Partida rápida sin terminar de Pedro»", () => {
    const a = pinta(
      qm({ match_format: 'SINGLES', outcome: 'UNFINISHED', score: null, unfinished: true, opponents: [{ user_id: 'me' }] }, { userId: 'u2' })
    );
    expect(frase()).toBe('Partida rápida sin terminar de Pedro');
    a.unmount();

    pinta(
      qm({ match_format: 'SINGLES', outcome: 'UNFINISHED', score: null, unfinished: true, opponents: [{ user_id: 'me' }] }, { userId: 'u2' }),
      { lng: 'en' }
    );
    expect(frase()).toBe("Pedro's unfinished quick match");
  });

  it('own stroke play unfinished: «Partida rápida sin terminar en El Saler · 18 puntos», no position, no holes', () => {
    const a = pinta(
      qm({
        scoring_format: 'STABLEFORD',
        unfinished: true,
        position: null,
        tied: false,
        best_gross_in_group: false,
        total_players: 3,
        points: 18,
        gross_strokes: 50,
        holes_played: 9,
      })
    );
    expect(frase()).toBe('Partida rápida sin terminar en El Saler · 18 puntos');
    a.unmount();

    pinta(qm({ scoring_format: 'STABLEFORD', unfinished: true, position: null, total_players: 3, points: 18, holes_played: 9 }), {
      lng: 'en',
    });
    expect(frase()).toBe('Unfinished quick match at El Saler · 18 points');
  });

  it('own Medal unfinished, and without the course', () => {
    const a = pinta(qm({ scoring_format: 'MEDAL', unfinished: true, position: null, total_players: 2, net_strokes: 40, holes_played: 9 }));
    expect(frase()).toBe('Partida rápida sin terminar en El Saler · 40 netos');
    a.unmount();

    pinta(qm({ golf_course_id: 'c-borrado', scoring_format: 'STABLEFORD', unfinished: true, position: null, total_players: 2, points: 12 }));
    expect(frase()).toBe('Partida rápida sin terminar · 12 puntos');
  });

  it("a friend's unfinished stroke play: «Partida rápida sin terminar de Pedro · 18 puntos»", () => {
    const a = pinta(
      qm({ scoring_format: 'STABLEFORD', unfinished: true, position: null, total_players: 3, points: 18, holes_played: 9 }, { userId: 'u2' })
    );
    expect(frase()).toBe('Partida rápida sin terminar de Pedro · 18 puntos');
    a.unmount();

    pinta(
      qm({ scoring_format: 'STABLEFORD', unfinished: true, position: null, total_players: 3, points: 18, holes_played: 9 }, { userId: 'u2' }),
      { lng: 'en' }
    );
    expect(frase()).toBe("Pedro's unfinished quick match · 18 points");
  });

  it('a counting round of fewer than 18 holes says how many: «Acabaste 1.º de 2 en El Saler · 18 puntos · 9 hoyos»', () => {
    const a = pinta(qm({ scoring_format: 'STABLEFORD', position: 1, tied: false, total_players: 2, points: 18, holes_played: 9 }));
    expect(frase()).toBe('Acabaste 1.º de 2 en El Saler · 18 puntos · 9 hoyos');
    a.unmount();

    pinta(qm({ scoring_format: 'STABLEFORD', position: 1, tied: false, total_players: 2, points: 18, holes_played: 9 }), { lng: 'en' });
    expect(frase()).toBe('You finished 1st of 2 at El Saler · 18 points · 9 holes');
  });

  it('the holes go after the gross strokes, with the real number', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 3, points: 25, gross_strokes: 60, holes_played: 12 }));
    expect(frase()).toBe('Acabaste 2.º de 3 en El Saler · 25 puntos (60 golpes) · 12 hoyos');
  });

  it('18 holes, or no number, add nothing', () => {
    const a = pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 3, points: 36, holes_played: 18 }));
    expect(frase()).toBe('Acabaste 2.º de 3 en El Saler · 36 puntos');
    a.unmount();

    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 3, points: 36, holes_played: null }));
    expect(frase()).toBe('Acabaste 2.º de 3 en El Saler · 36 puntos');
  });

  it('one hole is singular', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 2, holes_played: 1 }));
    expect(frase()).toBe('Acabaste la partida rápida en El Saler con 2 puntos · 1 hoyo');
  });

  it('alone and with a friend, the holes too', () => {
    const a = pinta(qm({ scoring_format: 'STABLEFORD', position: null, total_players: 1, points: 34, holes_played: 9 }));
    expect(frase()).toBe('Acabaste la partida rápida en El Saler con 34 puntos · 9 hoyos');
    a.unmount();

    const b = pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 31, holes_played: 9 }, { userId: 'u2' }));
    expect(frase()).toBe('Pedro acabó 2.º con 31 puntos · 9 hoyos');
    b.unmount();

    pinta(qm({ scoring_format: 'MEDAL', position: null, total_players: 1, net_strokes: 35, holes_played: 9 }, { userId: 'u2' }), {
      lng: 'en',
    });
    expect(frase()).toBe('Pedro finished the quick match with 35 net · 9 holes');
  });

  it('a shared best gross: «Mejor bruto del grupo (empatado)» / «Best gross in the group (tied)»', () => {
    const datos = { scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 30, best_gross_in_group: true, best_gross_tied: true };
    const a = pinta(qm(datos));
    expect(screen.getByText('Mejor bruto del grupo (empatado)')).toBeInTheDocument();
    a.unmount();

    const b = pinta(qm(datos), { lng: 'en' });
    expect(screen.getByText('Best gross in the group (tied)')).toBeInTheDocument();
    b.unmount();

    pinta(qm({ ...datos, best_gross_tied: false }));
    expect(screen.getByText('Mejor bruto del grupo')).toBeInTheDocument();
  });

  it('no tag when the best gross is not theirs, tied or not', () => {
    pinta(qm({ scoring_format: 'STABLEFORD', position: 2, total_players: 4, points: 30, best_gross_in_group: false, best_gross_tied: true }));
    expect(screen.queryByText(/Mejor bruto/)).not.toBeInTheDocument();
  });
});
