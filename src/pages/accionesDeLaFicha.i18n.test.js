import { describe, it, expect } from 'vitest';
import es from '../i18n/locales/es/competitions.json';
import en from '../i18n/locales/en/competitions.json';

/**
 * Cada acción de la ficha tiene su texto en los dos idiomas (FE #705).
 *
 * Al montar el menú se inventó `detail.actions.goToDraft`, que no existía en
 * ningún idioma, y el menú enseñó la clave cruda: i18next devuelve la clave
 * cuando no la encuentra. Lo vio el dueño del producto en el Kind, no los
 * 4371 tests, porque un test de componente solo ve el `t` que le pasas.
 */

// Las que usa `CompetitionDetail` al construir el menú y el botón principal
const ACCIONES = [
  'activate',
  'nameCaptains',
  'changeCaptains',
  'close-enrollments',
  'start-competition',
  'reopen-enrollments',
  'complete',
  'revert-status',
  'revert-to-in-progress',
  'manageSchedule',
  'manageInvitations',
  'edit',
  'leaderboard',
  'cancel',
  'delete',
  'more',
];

describe('Los textos de las acciones de la ficha', () => {
  it.each(['es', 'en'])('en %s no falta ninguno', (idioma) => {
    const textos = (idioma === 'es' ? es : en).detail.actions;

    const sinTraducir = ACCIONES.filter((accion) => !textos[accion]);

    expect(sinTraducir).toEqual([]);
  });

  it.each(['es', 'en'])('y en %s la sala de draft tiene el suyo', (idioma) => {
    // Vive en `draft.open`, que ya existía: el menú se inventó otra
    expect((idioma === 'es' ? es : en).draft.open).toBeTruthy();
  });
});
