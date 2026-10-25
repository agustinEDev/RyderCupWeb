import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18next from 'i18next';
import es from '../../i18n/locales/es/playerProfile.json';
import en from '../../i18n/locales/en/playerProfile.json';
import GamesTogether from './GamesTogether';

const instancias = {};
beforeAll(async () => {
  for (const lng of ['es', 'en']) {
    const i = i18next.createInstance();
    await i.init({
      lng,
      fallbackLng: 'es',
      ns: ['playerProfile'],
      defaultNS: 'playerProfile',
      resources: { es: { playerProfile: es }, en: { playerProfile: en } },
      interpolation: { escapeValue: false },
    });
    instancias[lng] = i;
  }
});

const torneo = (overrides = {}) => ({
  kind: 'TOURNAMENT_STROKE_PLAY',
  id: 'comp9',
  playedOn: '2026-10-25',
  golfCourseId: null,
  golfCourseName: null,
  format: 'STABLEFORD',
  relation: null,
  result: 'WON',
  quickMatchId: null,
  competitionId: 'comp9',
  competitionName: 'Liga de Otoño',
  matchId: null,
  myPosition: 4,
  myTied: false,
  theirPosition: 7,
  theirTied: false,
  totalPlayers: 16,
  ...overrides,
});

const pinta = (partida, lng = 'es') =>
  render(
    <MemoryRouter>
      <GamesTogether games={[partida]} t={instancias[lng].t} idioma={lng} />
    </MemoryRouter>
  );

const fila = () => screen.getByTestId('player-profile-game-comp9');

describe('GamesTogether — a tournament stroke play (J)', () => {
  it('shows the tournament name, both positions «4.º y 7.º de 16», the date, the format and the result', () => {
    pinta(torneo());

    expect(fila()).toHaveTextContent('Liga de Otoño');
    expect(screen.getByTestId('player-profile-game-positions')).toHaveTextContent('4.º y 7.º de 16');
    expect(fila()).toHaveTextContent('25 oct 2026');
    expect(fila()).toHaveTextContent('Stableford');
    expect(fila()).toHaveTextContent('Ganada');
    expect(fila()).not.toHaveTextContent('Campo sin nombre');
  });

  it('in English: «4th and 7th of 16»', () => {
    pinta(torneo({ result: 'LOST' }), 'en');

    expect(screen.getByTestId('player-profile-game-positions')).toHaveTextContent('4th and 7th of 16');
    expect(fila()).toHaveTextContent('Lost');
  });

  it('a shared position says so: «4.º (empatado) y 7.º (empatado) de 16» / «(tied)»', () => {
    const a = pinta(torneo({ myTied: true, theirTied: true }));
    expect(screen.getByTestId('player-profile-game-positions')).toHaveTextContent(
      '4.º (empatado) y 7.º (empatado) de 16'
    );
    a.unmount();

    pinta(torneo({ myTied: false, theirTied: true, myPosition: 1, theirPosition: 2 }), 'en');
    expect(screen.getByTestId('player-profile-game-positions')).toHaveTextContent('1st and 2nd (tied) of 16');
  });

  it('a tap goes to the tournament', () => {
    pinta(torneo());
    expect(fila()).toHaveAttribute('href', '/competitions/comp9');
  });

  it('without competition_id the id is the tournament', () => {
    pinta(torneo({ competitionId: null }));
    expect(fila()).toHaveAttribute('href', '/competitions/comp9');
  });

  it('without the tournament name: «Torneo sin nombre» / «Unnamed tournament», never «Campo sin nombre»', () => {
    const a = pinta(torneo({ competitionName: null }));
    expect(fila()).toHaveTextContent('Torneo sin nombre');
    expect(fila()).not.toHaveTextContent('Campo sin nombre');
    a.unmount();

    pinta(torneo({ competitionName: null }), 'en');
    expect(fila()).toHaveTextContent('Unnamed tournament');
  });

  it('without both positions no positions line; with no result, «Sin resultado»', () => {
    pinta(torneo({ theirPosition: null, result: null }));
    expect(screen.queryByTestId('player-profile-game-positions')).not.toBeInTheDocument();
    expect(fila()).toHaveTextContent('Sin resultado');
  });

  it('halved reads «Empatada»', () => {
    pinta(torneo({ result: 'HALVED' }));
    expect(fila()).toHaveTextContent('Empatada');
  });
});

// H5 (25 oct 2026): la partida rápida se fecha por su instante, en el día local
describe('GamesTogether · la fecha de la partida rápida', () => {
  it('H5: con playedAt, su día local; no el día UTC de playedOn', () => {
    pinta(torneo({ kind: 'QUICK_MATCH', playedOn: '2026-10-24', playedAt: new Date('2026-10-25T12:00:00Z') }));

    const esperado = new Date('2026-10-25T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    expect(fila()).toHaveTextContent(esperado);
  });
});
