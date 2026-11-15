import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import feedEs from '../../i18n/locales/es/feed.json';
import feedEn from '../../i18n/locales/en/feed.json';
import ActivityEventCard from './ActivityEventCard';

/**
 * Los avisos de Actividad de los hándicaps con la RFEG y del plazo de
 * inscripción (15 nov 2026; RyderCupAm #864 y #865). Todos son del propio
 * usuario (SELF).
 *
 *   caso                                         | frase                                                  | lleva a
 *   ---------------------------------------------|--------------------------------------------------------|-------------------
 *   P1 HANDICAPS_NOT_UPDATED, 3                  | «3 jugadores sin actualizar con la RFEG en X»          | la competición
 *   P1b HANDICAPS_NOT_UPDATED, 1                 | «1 jugador sin actualizar con la RFEG en X»            | la competición
 *   P2 RFEG_HANDICAP_NOT_FOUND                   | «No hemos encontrado tu hándicap en la RFEG para X»    | editar el perfil
 *   P3 ENROLLMENTS_CLOSED                        | «Se han cerrado las inscripciones de X»                | la competición
 *   P4 ENROLLMENT_CLOSE_BLOCKED, NO_TEE_WINDOW   | «N jugadores sin franja en X: colócalos y cierra»      | la competición
 *   P5 ENROLLMENT_CLOSE_BLOCKED, NO_HANDICAP     | propuesta, pendiente de aprobar                        | la competición
 *   P6 ENROLLMENT_CLOSE_BLOCKED, motivo raro     | «No se han podido cerrar las inscripciones de X»       | la competición
 *   P7 en inglés                                 | su texto en inglés                                     |
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

describe('ActivityEventCard — RFEG y plazo de inscripción', () => {
  it.each([
    [
      'P1',
      'HANDICAPS_NOT_UPDATED',
      { count: 3 },
      '3 jugadores sin actualizar con la RFEG en Ryder Otoño',
      '/competitions/c-1',
    ],
    [
      'P1b',
      'HANDICAPS_NOT_UPDATED',
      { count: 1 },
      '1 jugador sin actualizar con la RFEG en Ryder Otoño',
      '/competitions/c-1',
    ],
    [
      'P2',
      'RFEG_HANDICAP_NOT_FOUND',
      {},
      'No hemos encontrado tu hándicap en la RFEG para Ryder Otoño',
      '/profile/edit',
    ],
    [
      'P3',
      'ENROLLMENTS_CLOSED',
      {},
      'Se han cerrado las inscripciones de Ryder Otoño',
      '/competitions/c-1',
    ],
    [
      'P4',
      'ENROLLMENT_CLOSE_BLOCKED',
      { reason: 'NO_TEE_WINDOW', player_count: 2 },
      '2 jugadores sin franja en Ryder Otoño: colócalos y cierra',
      '/competitions/c-1',
    ],
    [
      'P5',
      'ENROLLMENT_CLOSE_BLOCKED',
      { reason: 'NO_HANDICAP', player_count: 2 },
      '2 jugadores sin hándicap en Ryder Otoño: pónselo y cierra',
      '/competitions/c-1',
    ],
    [
      'P6',
      'ENROLLMENT_CLOSE_BLOCKED',
      { reason: 'OTRO', player_count: 2 },
      'No se han podido cerrar las inscripciones de Ryder Otoño',
      '/competitions/c-1',
    ],
  ])(
    '%s: Given %s, When se pinta, Then la frase y adónde lleva',
    (_, type, extra, texto, ruta) => {
      pinta(conTorneo(type, extra));

      expect(frase()).toBe(texto);
      expect(enlaceDeLaTarjeta()).toHaveAttribute('href', ruta);
    },
  );

  it.each([
    [
      'HANDICAPS_NOT_UPDATED',
      { count: 3 },
      '3 players not updated with the RFEG in Ryder Otoño',
    ],
    [
      'RFEG_HANDICAP_NOT_FOUND',
      {},
      "We couldn't find your handicap with the RFEG for Ryder Otoño",
    ],
    ['ENROLLMENTS_CLOSED', {}, 'Enrolment for Ryder Otoño has closed'],
    [
      'ENROLLMENT_CLOSE_BLOCKED',
      { reason: 'NO_TEE_WINDOW', player_count: 2 },
      '2 players without a tee window in Ryder Otoño: place them and close',
    ],
    [
      'ENROLLMENT_CLOSE_BLOCKED',
      { reason: 'NO_HANDICAP', player_count: 2 },
      '2 players without a handicap in Ryder Otoño: set it and close',
    ],
  ])(
    'P7: Given %s en inglés, When se pinta, Then su texto',
    (type, extra, texto) => {
      pinta(conTorneo(type, extra), { lng: 'en' });

      expect(frase()).toBe(texto);
    },
  );
});
