import { describe, it, expect } from 'vitest';
import Invitation from './Invitation';
import InvitationStatus from '../value_objects/InvitationStatus';

const validProps = {
  id: 'inv-1',
  competitionId: 'comp-1',
  inviterId: 'user-1',
  inviteeEmail: 'player@example.com',
  inviteeUserId: 'user-2',
  status: InvitationStatus.pending(),
  personalMessage: 'Join us!',
  expiresAt: '2026-02-25T10:00:00Z',
  respondedAt: null,
  createdAt: '2026-02-18T10:00:00Z',
  updatedAt: '2026-02-18T10:00:00Z',
};

describe('Invitation', () => {
  describe('Constructor validation', () => {
    it('should create a valid invitation', () => {
      const inv = new Invitation(validProps);
      expect(inv.id).toBe('inv-1');
      expect(inv.competitionId).toBe('comp-1');
      expect(inv.inviterId).toBe('user-1');
      expect(inv.inviteeEmail).toBe('player@example.com');
      expect(inv.inviteeUserId).toBe('user-2');
      expect(inv.status.toString()).toBe('PENDING');
      expect(inv.personalMessage).toBe('Join us!');
    });

    it('should throw for missing id', () => {
      expect(() => new Invitation({ ...validProps, id: '' })).toThrow(TypeError);
    });

    it('should throw for missing competitionId', () => {
      expect(() => new Invitation({ ...validProps, competitionId: '' })).toThrow(TypeError);
    });

    it('should throw for missing inviterId', () => {
      expect(() => new Invitation({ ...validProps, inviterId: '' })).toThrow(TypeError);
    });

    it('should throw for missing inviteeEmail', () => {
      expect(() => new Invitation({ ...validProps, inviteeEmail: '' })).toThrow(TypeError);
    });

    it('should throw for invalid status', () => {
      expect(() => new Invitation({ ...validProps, status: 'PENDING' })).toThrow(TypeError);
    });
  });

  describe('Factory methods', () => {
    it('create should set status to PENDING', () => {
      const inv = Invitation.create({
        id: 'inv-1',
        competitionId: 'comp-1',
        inviterId: 'user-1',
        inviteeEmail: 'player@example.com',
        expiresAt: '2026-02-25T10:00:00Z',
      });
      expect(inv.isPending()).toBe(true);
      expect(inv.inviteeUserId).toBeNull();
    });

    it('fromPersistence should reconstruct with given status', () => {
      const inv = Invitation.fromPersistence({
        ...validProps,
        status: InvitationStatus.accepted(),
        respondedAt: '2026-02-19T10:00:00Z',
      });
      expect(inv.isAccepted()).toBe(true);
    });
  });

  describe('Query methods', () => {
    it('isPending / isAccepted / isDeclined / isExpired / isTerminal', () => {
      const pending = new Invitation(validProps);
      expect(pending.isPending()).toBe(true);
      expect(pending.isTerminal()).toBe(false);

      const accepted = Invitation.fromPersistence({ ...validProps, status: InvitationStatus.accepted() });
      expect(accepted.isAccepted()).toBe(true);
      expect(accepted.isTerminal()).toBe(true);

      const declined = Invitation.fromPersistence({ ...validProps, status: InvitationStatus.declined() });
      expect(declined.isDeclined()).toBe(true);

      const expired = Invitation.fromPersistence({ ...validProps, status: InvitationStatus.expired() });
      expect(expired.isExpired()).toBe(true);
    });

    it('hasInviteeUser should check inviteeUserId', () => {
      const withUser = new Invitation(validProps);
      expect(withUser.hasInviteeUser()).toBe(true);

      const withoutUser = new Invitation({ ...validProps, inviteeUserId: null });
      expect(withoutUser.hasInviteeUser()).toBe(false);
    });
  });

  describe('Command methods', () => {
    it('accept should return new instance with ACCEPTED status and respondedAt', () => {
      const pending = new Invitation(validProps);
      const accepted = pending.accept();

      expect(accepted.isAccepted()).toBe(true);
      expect(accepted.respondedAt).toBeInstanceOf(Date);
      // Original unchanged
      expect(pending.isPending()).toBe(true);
    });

    it('decline should return new instance with DECLINED status', () => {
      const pending = new Invitation(validProps);
      const declined = pending.decline();

      expect(declined.isDeclined()).toBe(true);
      expect(declined.respondedAt).toBeInstanceOf(Date);
    });

    it('accept should throw from terminal state', () => {
      const accepted = Invitation.fromPersistence({ ...validProps, status: InvitationStatus.accepted() });
      expect(() => accepted.accept()).toThrow('Invalid transition');
    });

    it('decline should throw from terminal state', () => {
      const expired = Invitation.fromPersistence({ ...validProps, status: InvitationStatus.expired() });
      expect(() => expired.decline()).toThrow('Invalid transition');
    });
  });

  describe('Serialization', () => {
    it('toPersistence should return flat object', () => {
      const inv = new Invitation(validProps);
      const data = inv.toPersistence();

      expect(data.id).toBe('inv-1');
      expect(data.competitionId).toBe('comp-1');
      expect(data.status).toBe('PENDING');
      expect(data.personalMessage).toBe('Join us!');
      expect(typeof data.createdAt).toBe('string');
    });
  });

  describe('equals', () => {
    it('should compare by id', () => {
      const a = new Invitation(validProps);
      const b = new Invitation(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for non-Invitation', () => {
      const a = new Invitation(validProps);
      expect(a.equals('not-an-invitation')).toBe(false);
    });
  });
});
