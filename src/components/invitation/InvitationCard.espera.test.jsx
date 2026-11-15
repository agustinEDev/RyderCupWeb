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
 *   W4 el organizador, en espera             | «Retirar», como en una pendiente (15 nov 2026)
 *   W5 el invitado, en espera                | conserva «Ver la competición», aunque haya pasado su caducidad
 *   W6 en espera con fecha de respuesta      | sin «Respondida»: nadie ha respondido
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

  it('W4: Given el organizador con una en espera, When se pinta, Then puede retirarla', () => {
    const retirar = vi.fn();
    render(
      <MemoryRouter>
        <InvitationCard
          invitation={enEspera}
          mode="creator"
          onWithdraw={retirar}
          t={t}
        />
      </MemoryRouter>,
    );

    screen.getByTestId('withdraw-button').click();

    expect(retirar).toHaveBeenCalledWith(enEspera);
  });

  it('W5: Given el invitado con una en espera ya pasada su caducidad, When se pinta, Then puede ver la competición', () => {
    pinta(
      {
        ...enEspera,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      'player',
    );

    expect(
      screen.getByRole('link', { name: 'card.viewCompetition: Summer Cup' }),
    ).toHaveAttribute('href', '/competitions/comp-1');
  });

  it('W6: Given una en espera con fecha de respuesta, When se pinta, Then sin «Respondida»', () => {
    pinta({ ...enEspera, respondedAt: '2026-11-15T10:00:00Z' }, 'creator');

    expect(screen.queryByTestId('fecha-de-la-invitacion')).toBeNull();
  });
});
