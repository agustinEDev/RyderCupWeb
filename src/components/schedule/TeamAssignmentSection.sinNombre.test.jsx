import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TeamAssignmentSection from './TeamAssignmentSection';

/**
 * Un jugador sin nombre ya no sale como su UUID (pasada del Kind, 31 oct 2026).
 *
 * | #  | Caso                                         | Ve                                |
 * |----|----------------------------------------------|-----------------------------------|
 * | T1 | La lista cargó                               | Los nombres                       |
 * | T2 | La lista no cargó, equipos formados          | «Jugador 1», «Jugador 2»… por     |
 * |    |                                              | equipo; nunca el UUID             |
 * | T3 | La lista cargó, pero a uno le falta el nombre| Ese, «Jugador N» por su posición; |
 * |    |                                              | los demás, su nombre              |
 * | T4 | Ese jugador es capitán y tiene hándicap      | Su papel y su hándicap, también   |
 */
const t = (clave, params) => {
  if (params?.numero !== undefined) return `${clave}:${params.numero}`;
  if (params?.value !== undefined) return `${clave}:${params.value}`;
  return clave;
};

const UUIDS_A = ['d0feb2d2-dee9-47aa-bc01-c368299d32fe', 'ba66905e-af9b-499e-98f4-0621ecbfe7a0'];
const UUIDS_B = ['4013fcad-b813-46a0-8581-e571714aa429', 'b40726ef-cc85-444b-aa05-eb3132231188'];

const pintar = ({ playerNameMap = new Map(), enrollments = [], inscritosSinCargar = false, captains } = {}) =>
  render(
    <TeamAssignmentSection
      teamAssignment={{ teamAPlayerIds: UUIDS_A, teamBPlayerIds: UUIDS_B, mode: 'AUTOMATIC' }}
      onAssignTeams={vi.fn()}
      onUndoTeams={vi.fn()}
      sePuedenDeshacer
      onFillCaptain={vi.fn()}
      canManage
      playerNameMap={playerNameMap}
      enrollments={enrollments}
      teamNames={{ teamA: 'Europa', teamB: 'América' }}
      maxPlayingHandicap={null}
      captains={captains ?? { teamA: null, teamB: null, viceTeamA: null, viceTeamB: null }}
      status="CLOSED"
      inscritosSinCargar={inscritosSinCargar}
      t={t}
    />
  );

const filas = (equipo) =>
  within(screen.getByText(new RegExp(`^${equipo}`)).parentElement)
    .getAllByRole('listitem')
    .map((li) => li.textContent);

const NOMBRES = new Map([
  [UUIDS_A[0], 'Ana Alba'],
  [UUIDS_A[1], 'Bea Blanco'],
  [UUIDS_B[0], 'Carla Cruz'],
  [UUIDS_B[1], 'Dani Díaz'],
]);
const aprobados = (ids) => ids.map((userId) => ({ userId, status: 'APPROVED', userHandicap: 12 }));

describe('TeamAssignmentSection · jugadores sin nombre', () => {
  it('T1: con la lista cargada salen los nombres', () => {
    pintar({ playerNameMap: NOMBRES });

    expect(filas('Europa')).toEqual(['Ana Alba', 'Bea Blanco']);
    expect(filas('América')).toEqual(['Carla Cruz', 'Dani Díaz']);
  });

  it('T2: sin la lista, «Jugador N» en cada equipo y ningún UUID', () => {
    pintar({ inscritosSinCargar: true });

    expect(filas('Europa')).toEqual(['unnamedPlayerNumbered:1', 'unnamedPlayerNumbered:2']);
    expect(filas('América')).toEqual(['unnamedPlayerNumbered:1', 'unnamedPlayerNumbered:2']);
    for (const id of [...UUIDS_A, ...UUIDS_B]) {
      expect(screen.queryByText(id, { exact: false })).not.toBeInTheDocument();
    }
  });

  it('T3: si solo a uno le falta el nombre, solo ese sale con su posición', () => {
    const sinBea = new Map(NOMBRES);
    sinBea.delete(UUIDS_A[1]);
    pintar({ playerNameMap: sinBea });

    expect(filas('Europa')).toEqual(['Ana Alba', 'unnamedPlayerNumbered:2']);
    expect(filas('América')).toEqual(['Carla Cruz', 'Dani Díaz']);
  });

  it('T4: el que no tiene nombre conserva su papel y su hándicap', () => {
    const sinAna = new Map(NOMBRES);
    sinAna.delete(UUIDS_A[0]);
    pintar({
      playerNameMap: sinAna,
      enrollments: aprobados([...UUIDS_A, ...UUIDS_B]),
      captains: { teamA: UUIDS_A[0], teamB: UUIDS_B[0], viceTeamA: null, viceTeamB: null },
    });

    const [primera] = filas('Europa');
    expect(primera).toContain('unnamedPlayerNumbered:1');
    expect(primera).toContain('teams.captainTag');
    expect(primera).toMatch(/handicapLabels\.index:12/);
  });
});
