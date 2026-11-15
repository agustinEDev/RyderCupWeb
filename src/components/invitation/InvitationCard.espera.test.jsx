import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import InvitationCard from './InvitationCard';

/**
 * F2 · La invitación en lista de espera (ON_HOLD, 15 nov 2026; RyderCupAm
 * B-02): con la inscripción cerrada, la invitación espera a que el organizador
 * la reabra. No se acepta (el servidor diría 409 INVITATION_ON_HOLD); sí se
 * rechaza.
 *
 *   caso                                     | qué se ve
 *   -----------------------------------------|----------------------------------------------------
 *   W1 el invitado, en espera                | «En lista de espera», el porqué y solo «Rechazar»
 *   W2 el organizador, en espera             | «En lista de espera» en su lista, sin el porqué
 *   W3 el invitado, pendiente                | «Aceptar» y «Rechazar», como siempre
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

const t = (key) => key;

const enEspera = {
  id: 'inv-1',
  competitionId: 'comp-1',
  competitionName: 'Summer Cup',
  inviterName: 'John Creator',
  inviteeEmail: 'player@example.com',
  inviteeName: 'Jane Player',
  status: 'ON_HOLD',
  isPending: false,
  isOnHold: true,
  isAccepted: false,
  isDeclined: false,
  isExpired: false,
  personalMessage: null,
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  respondedAt: null,
};

const pinta = (invitation, mode) =>
  render(
    <MemoryRouter>
      <InvitationCard
        invitation={invitation}
        mode={mode}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />
    </MemoryRouter>,
  );

describe('InvitationCard · en lista de espera', () => {
  it('W1: Given el invitado con una en espera, When se pinta, Then el porqué y solo «Rechazar»', () => {
    pinta(enEspera, 'player');

    expect(screen.getByTestId('invitation-badge')).toHaveTextContent(
      'status.ON_HOLD',
    );
    expect(screen.getByTestId('invitacion-en-espera')).toHaveTextContent(
      'card.onHold',
    );
    expect(screen.queryByTestId('accept-button')).toBeNull();
    expect(screen.getByTestId('decline-button')).toBeInTheDocument();
  });

  it('W2: Given el organizador con una en espera, When se pinta, Then su estado sin el porqué del invitado', () => {
    pinta(enEspera, 'creator');

    expect(screen.getByTestId('invitation-badge')).toHaveTextContent(
      'status.ON_HOLD',
    );
    expect(screen.queryByTestId('invitacion-en-espera')).toBeNull();
    expect(screen.queryByTestId('decline-button')).toBeNull();
  });

  it('W3: Given el invitado con una pendiente, When se pinta, Then «Aceptar» y «Rechazar»', () => {
    pinta(
      { ...enEspera, status: 'PENDING', isPending: true, isOnHold: false },
      'player',
    );

    expect(screen.getByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('decline-button')).toBeInTheDocument();
    expect(screen.queryByTestId('invitacion-en-espera')).toBeNull();
  });
});
