import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
 *   H5  '-' / '2a' / '  ' | el texto de siempre, y en el gris del texto de ayuda:
 *                 el color sigue a lo que se enseña, no a que haya algo guardado
 */
const Paso = ({ handicap, ...props }) => (
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
    {...props}
  />
);

const pinta = (handicap) => render(<Paso handicap={handicap} />);

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

describe('ParticipantsStep · el color sigue al texto (revisión del 21 oct)', () => {
  it.each(['-', '2a', '  '])('H5: con %j, que no es un índice, el texto y el color de ayuda', (guardado) => {
    pinta(guardado);

    expect(boton()).toHaveTextContent('create.participants.guestHandicap');
    expect(boton()).toHaveClass('text-gray-400');
    expect(boton()).not.toHaveClass('text-gray-900');
  });
});

describe('ParticipantsStep · amigos o invitado son pestañas (FE #658)', () => {
  const ConEstado = () => {
    const [pestana, setPestana] = useState('friends');
    return <Paso handicap="" participantTab={pestana} onParticipantTabChange={setPestana} />;
  };

  it('T1: barra con nombre, panel nombrado por su pestaña y las flechas', () => {
    render(<ConEstado />);

    const barra = screen.getByRole('tablist', { name: 'create.participants.tabsLabel' });
    const [amigos, invitado] = within(barra).getAllByRole('tab');
    expect(amigos).toBe(screen.getByTestId('quick-match-tab-friends'));
    expect(amigos).toHaveAttribute('aria-selected', 'true');
    expect(invitado).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel', { name: 'create.participants.tabFriends' });
    expect(amigos).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByText('create.participants.noFriends')).toBeInTheDocument();
    // La lista se desplaza: el panel entra en el tabulador para poder hacerlo
    expect(panel).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(amigos, { key: 'ArrowLeft' });

    expect(invitado).toHaveAttribute('aria-selected', 'true');
    expect(invitado).toHaveFocus();
    const formulario = screen.getByRole('tabpanel', { name: 'create.participants.tabGuest' });
    expect(formulario.tagName).toBe('FORM');
    // Un formulario: sus campos ya son paradas, el panel no
    expect(formulario).not.toHaveAttribute('tabindex');
    expect(within(formulario).getByTestId('quick-match-guest-first-name')).toBeInTheDocument();
  });
});

describe('ParticipantsStep · anillo de foco (22 oct)', () => {
  it('F2: el botón del hándicap enseña el anillo con el teclado y no al pulsar', () => {
    pinta('');
    expect(boton()).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');
    expect(boton().className).not.toMatch(/(^|\s)focus:ring/);
  });
});
