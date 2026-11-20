import { describe, it, expect } from 'vitest';
import { ActivityEventType } from './ActivityEventType';

// Los valores, tal cual circulan (social/domain/value_objects/activity_event_type.py, más TEAMS_CHANGED, que ya no se publica)
const DEL_BACKEND = [
  'HOLE_IN_ONE',
  'EAGLE_OR_BETTER',
  'BIRDIE',
  'NEW_COURSE',
  'PERSONAL_BEST',
  'FIRST_TOURNAMENT',
  'ENROLLMENT_APPROVED',
  'INVITED_TO_TOURNAMENT',
  'ENROLLMENT_REQUEST_CLOSED',
  'ENROLLMENT_REJECTED',
  'ENROLLED_IN_TOURNAMENT',
  'TOURNAMENT_MATCH_RESULT',
  'TOURNAMENT_FINAL_STANDING',
  'QUICK_MATCH_FINISHED',
  'ENROLLMENT_CONFIRMED',
  'TEE_TIME_ASSIGNED',
  'ENROLLMENT_REMOVED',
  'PLAYER_JOINED',
  'PLACE_FROM_WAITING_LIST',
  'ENROLLMENT_NO_PLACE',
  'TEE_WINDOW_REMOVED',
  'HANDICAPS_NOT_UPDATED',
  'RFEG_HANDICAP_NOT_FOUND',
  'ENROLLMENTS_CLOSED',
  'ENROLLMENT_CLOSE_BLOCKED',
  'INVITATION_ACCEPTABLE_AGAIN',
  'TEAMS_UNDONE_BY_ENTRY',
  'TEAMS_CHANGED',
];

describe('ActivityEventType', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ActivityEventType)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(ActivityEventType)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ActivityEventType)).toBe(true);
  });
});
