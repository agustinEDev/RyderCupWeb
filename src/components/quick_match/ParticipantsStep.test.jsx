import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParticipantsStep from './ParticipantsStep';

/**
 * El botón del hándicap del invitado enseña el índice como el resumen: un plus
 * guardado como «-2» se lee «+2.0» (FE #797). Lo guardado no cambia.
 *
 *   #   guardado | el botón
 *   ----|---------|----------------------------
 *   H1  '-2'     | «+2.0»
 *   H2  '12.4'   | «12.4»
 *   H3  '0'      | «0.0»
 *   H4  ''       | el texto de «hándicap» de siempre
 */
const pinta = (handicap) =>
  render(
    <ParticipantsStep
      t={(clave) => clave}
      currentUser={{ id: 'u1' }}
      participants={[]}
      capacity={4}
      rosterFull={false}
      isTeamFormat={false}
      isFreePlay
      selectedTeam="A"
      onSelectedTeamChange={vi.fn()}
      participantTab="guest"
      onParticipantTabChange={vi.fn()}
      availableFriends={[]}
      courseTees={[]}
      onAddFriend={vi.fn()}
      guestForm={{ firstName: '', lastName: '', handicap }}
      onGuestFirstNameChange={vi.fn()}
      onGuestLastNameChange={vi.fn()}
      onAddGuest={vi.fn()}
      onOpenGuestHandicapPanel={vi.fn()}
      guestTeeKey=""
      onGuestTeeKeyChange={vi.fn()}
      onRemoveParticipant={vi.fn()}
      isProcessing={false}
      onBack={vi.fn()}
      onClose={vi.fn()}
      onNext={vi.fn()}
    />
  );

const boton = () => screen.getByTestId('quick-match-guest-handicap-button');

describe('ParticipantsStep · hándicap del invitado', () => {
  it.each([
    ['-2', '+2.0'],
    ['12.4', '12.4'],
    ['0', '0.0'],
  ])('H1-H3: guardado %s se lee %s', (guardado, visto) => {
    pinta(guardado);

    expect(boton()).toHaveTextContent(visto);
    expect(boton()).toHaveClass('text-gray-900');
  });

  it('H4: sin hándicap enseña el texto de siempre', () => {
    pinta('');

    expect(boton()).toHaveTextContent('create.participants.guestHandicap');
    expect(boton()).toHaveClass('text-gray-400');
  });
});
