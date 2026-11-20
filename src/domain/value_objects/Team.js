/**
 * El código de cada equipo de una competición por equipos: A es el primero
 * (`team_1_name`) y B el segundo (`team_2_name`). Lo que se ve es el nombre que
 * puso el organizador; el código es lo que viaja por la API (ganador, quién va
 * por delante, a quién le toca en el draft, sobres…).
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/policies/snake_draft_service.py).
 *
 * @readonly
 * @enum {string}
 */
export const Team = Object.freeze({
  A: 'A',
  B: 'B',
});
