import { describe, it, expect } from 'vitest';
import ScheduleMapper from './ScheduleMapper';

/**
 * D1 (FE #824): la hoja de salidas de cada franja y el cupo total llegan a la
 * pantalla (RyderCupAm#508, #511, #512). En una Ryder no hay hoja.
 */
const franja = (extra = {}) => ({
  id: 'r-1',
  golf_course_id: 'g-1',
  round_date: '2030-10-12',
  session_type: 'MORNING',
  match_format: 'SINGLES',
  status: 'PENDING_MATCHES',
  tee_sheet: {
    first_tee_time: '08:00:00',
    last_tee_time: '11:50',
    interval_minutes: 10,
    group_size: 4,
    tee_times: ['08:00', '08:10'],
    capacity: 96,
    places_taken: 12,
    player_ids: ['u-1'],
    waiting_ids: ['u-2', 'u-3'],
  },
  ...extra,
});

describe('ScheduleMapper · las franjas (FE #824)', () => {
  it('D1: la hoja de salidas de una franja, con las horas en HH:MM', () => {
    expect(ScheduleMapper.toRoundDTO(franja()).teeSheet).toEqual({
      firstTeeTime: '08:00',
      lastTeeTime: '11:50',
      intervalMinutes: 10,
      groupSize: 4,
      teeTimes: ['08:00', '08:10'],
      capacity: 96,
      placesTaken: 12,
      playerIds: ['u-1'],
      waitingIds: ['u-2', 'u-3'],
    });
  });

  it('D1b: una sesión de la Ryder no tiene hoja', () => {
    expect(ScheduleMapper.toRoundDTO(franja({ tee_sheet: null })).teeSheet).toBeNull();
    const antigua = franja();
    delete antigua.tee_sheet;
    expect(ScheduleMapper.toRoundDTO(antigua).teeSheet).toBeNull();
  });

  it('D1c: el cupo total de las franjas, o null en una Ryder', () => {
    expect(ScheduleMapper.toScheduleDTO({ days: [], tee_sheet_capacity: 172 }).teeSheetCapacity).toBe(172);
    expect(ScheduleMapper.toScheduleDTO({ days: [] }).teeSheetCapacity).toBeNull();
  });
});
