import { describe, it, expect } from 'vitest';
import InvitationMapper from './InvitationMapper';

const invitacion = (status) => ({
  id: `inv-${status}`,
  competition_id: 'comp-1',
  inviter_id: 'org',
  invitee_email: `${status.toLowerCase()}@test.com`,
  status,
  created_at: '2026-09-24T10:00:00',
  updated_at: '2026-09-24T10:00:00',
});

describe('InvitationMapper', () => {
  it('A2: una invitación sin plaza no tumba la lista entera (#710)', () => {
    // Al cerrar la inscripción el servidor las deja en NO_ROOM. Sin conocer el
    // estado, el mapper lanzaba y «Mis invitaciones» no cargaba ninguna
    const lista = InvitationMapper.toDomainMany([
      invitacion('PENDING'),
      invitacion('NO_ROOM'),
    ]);

    expect(lista.map((i) => i.status.toString())).toEqual([
      'PENDING',
      'NO_ROOM',
    ]);
  });

  it('C9: una invitación por id llega sin correo y se lee igual', () => {
    const inv = InvitationMapper.toDomain({
      ...invitacion('PENDING'),
      invitee_email: undefined,
      invitee_user_id: 'u-2',
    });
    expect(inv.inviteeEmail).toBeNull();
    expect(inv.inviteeUserId).toBe('u-2');
  });

  it('C9: sin correo ni invitado sigue siendo un error', () => {
    expect(() =>
      InvitationMapper.toDomain({
        ...invitacion('PENDING'),
        invitee_email: undefined,
      }),
    ).toThrow();
  });
});
