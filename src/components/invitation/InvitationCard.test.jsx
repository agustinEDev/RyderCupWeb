import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InvitationCard from './InvitationCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

const mockT = (key) => key;

const pendingInvitation = {
  id: 'inv-1',
  competitionId: 'comp-1',
  competitionName: 'Summer Cup',
  inviterName: 'John Creator',
  inviteeEmail: 'player@example.com',
  inviteeName: 'Jane Player',
  status: 'PENDING',
  isPending: true,
  isAccepted: false,
  isDeclined: false,
  isExpired: false,
  personalMessage: 'Join our tournament!',
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  respondedAt: null,
};

const acceptedInvitation = {
  ...pendingInvitation,
  id: 'inv-2',
  status: 'ACCEPTED',
  isPending: false,
  isAccepted: true,
  respondedAt: '2026-02-19T10:00:00Z',
};

describe('InvitationCard', () => {
  let onAccept;
  let onDecline;

  beforeEach(() => {
    onAccept = vi.fn();
    onDecline = vi.fn();
  });

  it('should render competition name and status badge', () => {
    render(<InvitationCard invitation={pendingInvitation} mode="player" t={mockT} />);
    expect(screen.getByText('Summer Cup')).toBeInTheDocument();
    expect(screen.getByTestId('invitation-badge')).toBeInTheDocument();
  });

  it('should show inviter name in player mode', () => {
    render(<InvitationCard invitation={pendingInvitation} mode="player" t={mockT} />);
    expect(screen.getByText(/John Creator/)).toBeInTheDocument();
  });

  it('should show invitee email in creator mode', () => {
    render(<InvitationCard invitation={pendingInvitation} mode="creator" t={mockT} />);
    expect(screen.getByText('Jane Player')).toBeInTheDocument();
  });

  it('should show personal message', () => {
    render(<InvitationCard invitation={pendingInvitation} mode="player" t={mockT} />);
    expect(screen.getByText('Join our tournament!')).toBeInTheDocument();
  });

  it('should show accept/decline buttons in player mode for PENDING', () => {
    render(
      <InvitationCard
        invitation={pendingInvitation}
        mode="player"
        onAccept={onAccept}
        onDecline={onDecline}
        isProcessing={false}
        t={mockT}
      />
    );
    expect(screen.getByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('decline-button')).toBeInTheDocument();
  });

  it('should NOT show buttons in creator mode', () => {
    render(<InvitationCard invitation={pendingInvitation} mode="creator" t={mockT} />);
    expect(screen.queryByTestId('accept-button')).not.toBeInTheDocument();
  });

  it('should NOT show buttons for non-PENDING in player mode', () => {
    render(<InvitationCard invitation={acceptedInvitation} mode="player" t={mockT} />);
    expect(screen.queryByTestId('accept-button')).not.toBeInTheDocument();
  });

  it('should call onAccept when accept button is clicked', () => {
    render(
      <InvitationCard
        invitation={pendingInvitation}
        mode="player"
        onAccept={onAccept}
        onDecline={onDecline}
        isProcessing={false}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByTestId('accept-button'));
    expect(onAccept).toHaveBeenCalledWith('inv-1');
  });

  it('should call onDecline when decline button is clicked', () => {
    render(
      <InvitationCard
        invitation={pendingInvitation}
        mode="player"
        onAccept={onAccept}
        onDecline={onDecline}
        isProcessing={false}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByTestId('decline-button'));
    expect(onDecline).toHaveBeenCalledWith('inv-1');
  });
});
