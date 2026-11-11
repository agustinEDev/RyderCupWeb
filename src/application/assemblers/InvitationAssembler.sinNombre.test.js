import { describe, it, expect } from 'vitest';
import InvitationAssembler from './InvitationAssembler';
import InvitationMapper from '../../infrastructure/mappers/InvitationMapper';

/**
 * Una invitación a una cuenta sin verificar llega sin invitee_name ni invitee_user_id
 * (fase 3, BE-3): se lee igual, con el correo y sin nombre (la tarjeta enseña el correo).
 */
const API = {
  id: 'inv-1',
  competition_id: 'c-1',
  inviter_id: 'org-1',
  invitee_email: 'sinverificar@example.com',
  status: 'PENDING',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('InvitationAssembler · invitado sin nombre (fase 3)', () => {
  it('queda con el correo, sin nombre ni usuario', () => {
    const dto = InvitationAssembler.toSimpleDTO(InvitationMapper.toDomain(API), API);

    expect(dto.inviteeEmail).toBe('sinverificar@example.com');
    expect(dto.inviteeUserId).toBeNull();
    expect(dto.inviteeName).toBeUndefined();
    expect(dto.hasInviteeUser).toBe(false);
  });
});
