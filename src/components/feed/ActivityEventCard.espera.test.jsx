import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import feedEs from '../../i18n/locales/es/feed.json';
import feedEn from '../../i18n/locales/en/feed.json';
import ActivityEventCard from './ActivityEventCard';

/**
 * Los avisos de Actividad de las invitaciones en espera y de los equipos que
 * se deshacen al entrar alguien (15 nov 2026; RyderCupAm B-02).
 *
 *   caso                                    | frase                                                                          | lleva a
 *   ----------------------------------------|--------------------------------------------------------------------------------|----------------
 *   E1 TEAMS_UNDONE_BY_ENTRY                | «Ana Gil ha entrado en X: los equipos se han deshecho y hay que volver a formarlos» | la competición
 *   E1b TEAMS_UNDONE_BY_ENTRY sin nombre    | «Un jugador ha entrado en X: …»                                                 | la competición
 *   E2 INVITATION_ACCEPTABLE_AGAIN          | propuesta, pendiente de aprobar                                                 | la competición
 *   E3 en inglés                            | su texto en inglés                                                              |
 */
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

const pinta = (
  t,
  { lng = 'es', autores = AUTORES, campos = CAMPOS, ahora = AHORA } = {},
) =>
  render(
    <I18nextProvider i18n={instancias[lng]}>
      <MemoryRouter>
        <ActivityEventCard
          tarjeta={t}
          autores={autores}
          campos={campos}
          yoId={YO}
          ahora={ahora}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

const frase = () => screen.getByTestId('frase-tarjeta').textContent;
const enlaceDeLaTarjeta = () => screen.queryByTestId('enlace-tarjeta');

const conTorneo = (type, extra = {}) =>
  tarjeta(
    evento({
      type,
      payload: {
        competition_id: 'c-1',
        competition_name: 'Ryder Otoño',
        start_date: '2026-11-14',
        end_date: '2026-11-15',
        ...extra,
      },
    }),
  );

describe('ActivityEventCard — invitaciones en espera y equipos deshechos', () => {
  it.each([
    [
      'E1',
      'TEAMS_UNDONE_BY_ENTRY',
      { player_id: 'u9', player_name: 'Ana Gil' },
      'Ana Gil ha entrado en Ryder Otoño: los equipos se han deshecho y hay que volver a formarlos',
    ],
    [
      'E1b',
      'TEAMS_UNDONE_BY_ENTRY',
      { player_id: 'u9', player_name: null },
      'Un jugador ha entrado en Ryder Otoño: los equipos se han deshecho y hay que volver a formarlos',
    ],
    [
      'E2',
      'INVITATION_ACCEPTABLE_AGAIN',
      {},
      'Se han reabierto las inscripciones de Ryder Otoño: ya puedes aceptar tu invitación',
    ],
  ])(
    '%s: Given %s, When se pinta, Then la frase y lleva a la competición',
    (_, type, extra, texto) => {
      pinta(conTorneo(type, extra));

      expect(frase()).toBe(texto);
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', '/competitions/c-1');
    },
  );

  it.each([
    [
      'TEAMS_UNDONE_BY_ENTRY',
      { player_name: 'Ana Gil' },
      'Ana Gil has joined Ryder Otoño: the teams have been undone and need to be formed again',
    ],
    [
      'INVITATION_ACCEPTABLE_AGAIN',
      {},
      'Enrolment for Ryder Otoño has reopened: you can now accept your invitation',
    ],
  ])(
    'E3: Given %s en inglés, When se pinta, Then su texto',
    (type, extra, texto) => {
      pinta(conTorneo(type, extra), { lng: 'en' });

      expect(frase()).toBe(texto);
    },
  );
});
