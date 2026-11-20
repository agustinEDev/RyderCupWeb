import { describe, it, expect } from 'vitest';
import InvitationMapper from './InvitationMapper';
import { aExtras } from './conExtras';

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

describe('aExtras con la respuesta de Invitation', () => {
  it('traduce los nombres del join a camelCase', () => {
    expect(
      aExtras({
        ...invitacion('PENDING'),
        competition_name: 'Summer Cup',
        inviter_name: 'Creator',
        invitee_name: 'Player',
      }),
    ).toMatchObject({
      competitionName: 'Summer Cup',
      inviterName: 'Creator',
      inviteeName: 'Player',
    });
  });

  it('sin respuesta devuelve null', () => {
    expect(aExtras(null)).toBeNull();
    expect(aExtras(undefined)).toBeNull();
  });

  it('copia tal cual: lo que falta queda undefined, null y vacío se mantienen', () => {
    const extras = aExtras({
      ...invitacion('PENDING'),
      inviter_name: null,
      invitee_name: '',
    });

    expect(extras.competitionName).toBeUndefined();
    expect(extras.inviterName).toBeNull();
    expect(extras.inviteeName).toBe('');
  });
});
