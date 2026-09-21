import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as renderSinRouter, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import InvitationCard from './InvitationCard';

// La tarjeta aceptada enlaza a su competición (FE #682): necesita un router
const render = (ui) => renderSinRouter(ui, { wrapper: MemoryRouter });

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

  /**
   * Una invitación aceptada lleva a su competición desde su propia tarjeta
   * (FE #682). Antes el acceso estaba en una caja aparte, sin título, con los
   * nombres de todas las aceptadas en fila.
   */
  describe('enlace a la competición (FE #682)', () => {
    it('I1: aceptada, la tarjeta entera lleva a la competición', () => {
      render(<InvitationCard invitation={acceptedInvitation} mode="player" t={mockT} />);

      const tarjeta = screen.getByTestId('invitation-card');
      expect(tarjeta.tagName).toBe('A');
      expect(tarjeta).toHaveAttribute('href', '/competitions/comp-1');
    });

    it('I4: y lleva una flecha que dice que se abre', () => {
      // Sin ratón no hay subrayado al pasar por encima: en el móvil la flecha
      // es lo único que dice que la tarjeta se puede pulsar
      render(<InvitationCard invitation={acceptedInvitation} mode="player" t={mockT} />);

      expect(screen.getByTestId('invitation-card')).toContainElement(
        screen.getByTestId('abre-competicion')
      );
    });

    it('I2: pendiente, no enlaza: si puede ver una privada antes de aceptar lo decide RyderCupAM#329', () => {
      render(<InvitationCard invitation={pendingInvitation} mode="player" t={mockT} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('abre-competicion')).not.toBeInTheDocument();
    });

    it('I3: el organizador no necesita el enlace: su lista ya está dentro de la competición', () => {
      render(<InvitationCard invitation={acceptedInvitation} mode="creator" t={mockT} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('C1: la ficha sabe que se llegó desde las invitaciones, para volver ahí', () => {
      const Origen = () => <div data-testid="origen">{useLocation().state?.from}</div>;
      renderSinRouter(
        <MemoryRouter initialEntries={['/player/invitations']}>
          <Routes>
            <Route
              path="/player/invitations"
              element={<InvitationCard invitation={acceptedInvitation} mode="player" t={mockT} />}
            />
            <Route path="/competitions/:id" element={<Origen />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('invitation-card'));

      expect(screen.getByTestId('origen')).toHaveTextContent('invitations');
    });
  });
});
