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
    waiting_count: 5,
    my_waiting_position: 4,
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
      // Release social 2: los ids, los que deja ver; la cuenta y el puesto, de verdad
      waitingCount: 5,
      myWaitingPosition: 4,
    });
  });

  it('D1c: de un servidor de antes, la cuenta sale de los ids y sin puesto', () => {
    const vieja = franja();
    delete vieja.tee_sheet.waiting_count;
    delete vieja.tee_sheet.my_waiting_position;

    const hoja = ScheduleMapper.toRoundDTO(vieja).teeSheet;

    expect(hoja.waitingCount).toBe(2);
    expect(hoja.myWaitingPosition).toBeNull();
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

describe('ScheduleMapper · el estado de la tarjeta en las partidas (QA 2, 12 oct 2026)', () => {
  const grupo = (players) => ({ id: 'g', number: 1, tee_time: '08:00:00', status: 'SCHEDULED', incomplete: false, players });
  const jugador = (extra = {}) => ({ user_id: 'u', name: 'U', handicap: '1.0', playing_handicap: 1, tee_color: 'YELLOW', strokes_by_hole: [], ...extra });

  it('lleva el de cada jugador', () => {
    const dto = ScheduleMapper.toTeeGroupDTO(grupo([jugador({ card_status: 'NO_PRESENTADO' })]));

    expect(dto.players[0].cardStatus).toBe('NO_PRESENTADO');
  });

  it('un backend de antes, que no lo trae: juega', () => {
    expect(ScheduleMapper.toTeeGroupDTO(grupo([jugador()])).players[0].cardStatus).toBe('JUGANDO');
  });

  it('#544: cada partida dice si se puede tocar, y la franja si cabe una nueva', () => {
    const vista = ScheduleMapper.toTeeGroupsDTO({
      round_id: 'r-1',
      editable: false,
      can_add_group: true,
      unassigned_players: [],
      groups: [
        { id: 'p-1', number: 1, tee_time: '09:00', status: 'IN_PROGRESS', incomplete: false, can_change: false, players: [] },
        { id: 'p-2', number: 2, tee_time: '09:10', status: 'SCHEDULED', incomplete: false, can_change: true, players: [] },
      ],
    });

    expect(vista.canAddGroup).toBe(true);
    expect(vista.groups.map((g) => g.canChange)).toEqual([false, true]);
  });

  it('#544: un backend sin los campos nuevos, todo según `editable`', () => {
    const vista = ScheduleMapper.toTeeGroupsDTO({
      round_id: 'r-1',
      editable: true,
      unassigned_players: [],
      groups: [{ id: 'p-1', number: 1, tee_time: '09:00', status: 'SCHEDULED', incomplete: false, players: [] }],
    });

    expect(vista.canAddGroup).toBe(true);
    expect(vista.groups[0].canChange).toBe(true);
  });
});
