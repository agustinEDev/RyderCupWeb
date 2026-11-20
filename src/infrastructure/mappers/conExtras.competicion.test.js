import { describe, it, expect } from 'vitest';
import { aExtras } from './conExtras';

/**
 * Lo que la entidad no guarda y la ficha enseña, en camelCase y tal cual
 * llegó: sin valores por defecto, que los pone el assembler.
 */
describe('aExtras con la respuesta de Competition', () => {
  it('sin respuesta, null', () => {
    expect(aExtras(null)).toBeNull();
    expect(aExtras(undefined)).toBeNull();
  });

  it('traduce los campos y lo que va dentro de los anidados', () => {
    const extras = aExtras({
      id: 'c-1',
      location: 'España',
      countries: [{ code: 'ES', name_en: 'Spain', name_es: 'España' }],
      enrollment_opens_days_before: 10,
      enrollment_deadline: '2030-10-11T10:00:00Z',
      enrollment_deadline_applies: true,
      enrollment_closed_by_deadline: false,
      can_delete: true,
      handicap_update: {
        status: 'COMPLETED',
        origin: 'ORGANIZER',
        started_at: 'a',
        finished_at: 'b',
        pending_players: [{ user_id: 'u1', name: 'Ana' }],
        not_updated_players: [{ user_id: 'u2', name: 'Bea' }],
      },
      handicap_update_window: {
        open: true,
        closes_at: 'c',
        reason: 'r',
        reason_code: 'RC',
        scheduled_at: 's',
      },
      golf_courses: [{ id: 'gc', name: 'Saler', country_code: 'ES' }],
      playing_days: 2,
      my_next_session: {
        date: 'd',
        session_type: 'MORNING',
        tee_time: '09:00',
      },
      my_pending_invitation: { id: 'inv', expires_at: 'e' },
      modality: 'FOURBALL',
      setup_mode: 'RYDER_CUP',
      teams_assigned: true,
      enrolled_visibility: 'ALL',
      team_a_captain_id: 'a',
      team_b_captain_id: 'b',
      team_a_vice_captain_id: 'va',
      team_b_vice_captain_id: 'vb',
      enrolled_count: 3,
      is_creator: true,
      creator: {
        id: 'u0',
        first_name: 'Carlos',
        last_name: 'Campos',
        display_name: 'Charly',
        full_name: 'Carlos Campos',
        name: 'Carlos',
        alias: 'Charly',
        handicap: '12.0',
        country_code: 'ES',
      },
      user_enrollment_status: 'APPROVED',
      pending_enrollments_count: 1,
      actual_team_assignment: 'MANUAL',
      max_playing_handicap: 18,
    });

    expect(extras).toMatchObject({
      location: 'España',
      countries: [{ code: 'ES', nameEn: 'Spain', nameEs: 'España' }],
      enrollmentOpensDaysBefore: 10,
      enrollmentDeadline: '2030-10-11T10:00:00Z',
      enrollmentDeadlineApplies: true,
      enrollmentClosedByDeadline: false,
      canDelete: true,
      handicapUpdate: {
        status: 'COMPLETED',
        origin: 'ORGANIZER',
        startedAt: 'a',
        finishedAt: 'b',
        pendingPlayers: [{ userId: 'u1', name: 'Ana' }],
        notUpdatedPlayers: [{ userId: 'u2', name: 'Bea' }],
      },
      handicapUpdateWindow: {
        open: true,
        closesAt: 'c',
        reason: 'r',
        reasonCode: 'RC',
        scheduledAt: 's',
      },
      golfCourses: [{ id: 'gc', name: 'Saler', countryCode: 'ES' }],
      playingDays: 2,
      myNextSession: { date: 'd', sessionType: 'MORNING', teeTime: '09:00' },
      myPendingInvitation: { id: 'inv', expiresAt: 'e' },
      modality: 'FOURBALL',
      setupMode: 'RYDER_CUP',
      teamsAssigned: true,
      enrolledVisibility: 'ALL',
      teamACaptainId: 'a',
      teamBCaptainId: 'b',
      teamAViceCaptainId: 'va',
      teamBViceCaptainId: 'vb',
      enrolledCount: 3,
      isCreator: true,
      creator: {
        id: 'u0',
        firstName: 'Carlos',
        lastName: 'Campos',
        displayName: 'Charly',
        fullName: 'Carlos Campos',
        name: 'Carlos',
        alias: 'Charly',
        handicap: '12.0',
        countryCode: 'ES',
      },
      userEnrollmentStatus: 'APPROVED',
      pendingEnrollmentsCount: 1,
      actualTeamAssignment: 'MANUAL',
      maxPlayingHandicap: 18,
    });
  });

  it('lo que falta queda undefined, sin valores por defecto', () => {
    const extras = aExtras({ id: 'c-1' });

    expect(extras.location).toBeUndefined();
    expect(extras.creator).toBeUndefined();
    expect(extras.handicapUpdate).toBeUndefined();
  });

  it('los anidados nulos o con huecos se quedan como llegan', () => {
    const extras = aExtras({
      countries: null,
      golf_courses: null,
      creator: null,
      my_next_session: null,
      handicap_update: { status: 'IN_PROGRESS', pending_players: null },
      handicap_update_window: { open: false },
      enrolled_count: 0,
      can_delete: 'true',
    });

    expect(extras.countries).toBeNull();
    expect(extras.golfCourses).toBeNull();
    expect(extras.creator).toBeNull();
    expect(extras.myNextSession).toBeNull();
    expect(extras.handicapUpdate).toEqual({
      status: 'IN_PROGRESS',
      origin: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      pendingPlayers: null,
      notUpdatedPlayers: undefined,
    });
    expect(extras.handicapUpdateWindow.closesAt).toBeUndefined();
    expect(extras.enrolledCount).toBe(0);
    expect(extras.canDelete).toBe('true');
  });
});
