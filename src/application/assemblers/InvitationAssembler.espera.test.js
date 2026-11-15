import { describe, it, expect } from 'vitest';
import InvitationAssembler from './InvitationAssembler';
import InvitationMapper from '../../infrastructure/mappers/InvitationMapper';

/**
 * Una invitación en lista de espera (ON_HOLD, 15 nov 2026; RyderCupAm B-02)
 * llega a la pantalla por el camino real: respuesta → mapper → assembler.
 *
 *   caso                  | qué llega
 *   ----------------------|-----------------------------------------------
 *   A1 ON_HOLD            | se lee (no revienta) y dice que espera, no pendiente
 *   A2 PENDING            | no espera
 */
const API = (status) => ({
  id: 'inv-1',
  competition_id: 'c-1',
  inviter_id: 'org-1',
  invitee_email: 'ana@example.com',
  invitee_user_id: 'u-1',
  status,
  expires_at: '2026-11-20T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
});

const llega = (status) =>
  InvitationAssembler.toSimpleDTO(
    InvitationMapper.toDomain(API(status)),
    API(status),
  );

describe('InvitationAssembler · en lista de espera', () => {
  it('A1: Given ON_HOLD, When llega, Then espera y no está pendiente', () => {
    const dto = llega('ON_HOLD');

    expect(dto.status).toBe('ON_HOLD');
    expect(dto.isOnHold).toBe(true);
    expect(dto.isPending).toBe(false);
  });

  it('A2: Given PENDING, When llega, Then no espera', () => {
    expect(llega('PENDING').isOnHold).toBe(false);
  });
});
