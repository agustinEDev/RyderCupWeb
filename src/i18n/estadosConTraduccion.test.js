import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import MatchStatus from '../domain/value_objects/MatchStatus';
import { RoundStatus } from '../domain/value_objects/RoundStatus';
import { MatchFormat } from '../domain/value_objects/MatchFormat';
import { ScoringFormat } from '../domain/value_objects/ScoringFormat';
import { SessionType } from '../domain/value_objects/SessionType';
import { MatchOutcome } from '../domain/value_objects/MatchOutcome';
import { GolfCourseApprovalStatus } from '../domain/value_objects/GolfCourseApprovalStatus';
import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';
import InvitationStatus from '../domain/value_objects/InvitationStatus';
import FriendshipStatus from '../domain/value_objects/FriendshipStatus';
import { ESTADOS_DEL_FILTRO } from '../components/invitation/estadosDelFiltro';

/**
 * Cada valor de los estados y formatos del dominio que se enseña tiene su
 * texto en los dos idiomas (Tabla E1-1, 18 nov 2026).
 *
 * La interfaz arma la clave con el valor: `t(\`formats.${matchFormat}\`)`. Un
 * valor nuevo en el enum sin su texto saldría en pantalla como la clave, y
 * `clavesQueExisten.test.js` no lo ve porque no mira las claves armadas.
 *
 *   espacio        | prefijo                        | valores
 *   ---------------|--------------------------------|-----------------------------
 *   schedule       | status                         | MatchStatus y RoundStatus
 *   schedule       | formats                        | MatchFormat
 *   schedule       | sessions                       | SessionType
 *   dashboard      | nextMatch.session              | SessionType
 *   dashboard      | nextMatch.format               | MatchFormat
 *   dashboard      | recentMatches.format           | MatchFormat y ScoringFormat
 *   dashboard      | recentMatches.result(Short)    | MatchOutcome
 *   feed           | teeTime.session                | SessionType
 *   playerProfile  | gamesTogether.format           | MatchFormat y ScoringFormat
 *   playerProfile  | gamesTogether.result           | MatchOutcome
 *   quickMatch     | history.format                 | MatchFormat y ScoringFormat
 *   quickMatch     | create.course.corto            | MatchFormat y ScoringFormat
 *   golfCourses    | table.statuses                 | GolfCourseApprovalStatus
 *   competitions   | status                         | CompetitionStatusEnum (*)
 *   invitations    | status                         | el filtro y InvitationStatus
 *   friends        | status                         | FriendshipStatus
 *
 * (*) La tabla del admin busca en ['admin', 'competitions']: admin no tiene
 * `status`, así que el texto sale de competitions.
 */

const IDIOMAS = ['es', 'en'];
const LOCALES = resolve(globalThis.process.cwd(), 'src/i18n/locales');

const textos = (idioma, espacio) =>
  JSON.parse(readFileSync(resolve(LOCALES, idioma, `${espacio}.json`), 'utf8'));

const texto = (idioma, espacio, clave) =>
  clave
    .split('.')
    .reduce(
      (nodo, parte) =>
        nodo && typeof nodo === 'object' ? nodo[parte] : undefined,
      textos(idioma, espacio),
    );

const FORMATOS = [
  ...Object.values(MatchFormat),
  ...Object.values(ScoringFormat),
];

const FAMILIAS = [
  [
    'schedule',
    'status',
    [...MatchStatus.getAllValues(), ...Object.values(RoundStatus)],
  ],
  ['schedule', 'formats', Object.values(MatchFormat)],
  ['schedule', 'sessions', Object.values(SessionType)],
  ['dashboard', 'nextMatch.session', Object.values(SessionType)],
  ['dashboard', 'nextMatch.format', Object.values(MatchFormat)],
  ['dashboard', 'recentMatches.format', FORMATOS],
  ['dashboard', 'recentMatches.result', Object.values(MatchOutcome)],
  ['dashboard', 'recentMatches.resultShort', Object.values(MatchOutcome)],
  ['feed', 'teeTime.session', Object.values(SessionType)],
  ['playerProfile', 'gamesTogether.format', FORMATOS],
  ['playerProfile', 'gamesTogether.result', Object.values(MatchOutcome)],
  ['quickMatch', 'history.format', FORMATOS],
  ['quickMatch', 'create.course.corto', FORMATOS],
  ['golfCourses', 'table.statuses', Object.values(GolfCourseApprovalStatus)],
  ['competitions', 'status', Object.values(CompetitionStatusEnum)],
  ['invitations', 'status', ESTADOS_DEL_FILTRO],
  ['invitations', 'status', InvitationStatus.getAllValues()],
  ['friends', 'status', FriendshipStatus.getAllValues()],
];

describe('estados y formatos del dominio, con su texto', () => {
  it.each(FAMILIAS)(
    '%s · %s: cada valor, en español y en inglés',
    (espacio, prefijo, valores) => {
      const faltan = IDIOMAS.flatMap((idioma) =>
        valores
          .filter(
            (valor) =>
              typeof texto(idioma, espacio, `${prefijo}.${valor}`) !== 'string',
          )
          .map((valor) => `${idioma}/${espacio}:${prefijo}.${valor}`),
      );

      expect(faltan).toEqual([]);
    },
  );
});
