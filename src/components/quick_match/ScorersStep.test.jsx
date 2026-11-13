/**
 * Quién anota, con botones grandes (Agustín, 4 nov 2026: la casilla era
 * pequeña para el dedo). Tabla:
 *
 *   #    caso                                       | se ve
 *   -----|-------------------------------------------|----------------------------------
 *   B1   cada registrado                            | un botón con su nombre, que dice
 *        |                                           | si anota (`aria-pressed`)
 *   B2   pulsar                                     | marca; otra vez, desmarca
 *   B3   anota / no anota                           | móvil verde y botón coloreado /
 *        |                                           | móvil rojo tachado y botón blanco
 *        |                                           | (tachado: no depende del color)
 *   B4   tú                                         | anotas siempre: marcado, fijo y
 *        |                                           | con «(tú)»
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ScorersStep from './ScorersStep';

const t = (key) => key;
const yo = { id: 'user-1' };
const JUGADORES = [
  { participantId: 'user-1', userId: 'user-1', name: 'Yo' },
  { participantId: 'user-2', userId: 'user-2', name: 'Ana' },
];

const pinta = (scorerIds, onToggleScorer = vi.fn()) => {
  render(
    <ScorersStep
      t={t}
      registeredParticipants={JUGADORES}
      currentUser={yo}
      scorerIds={scorerIds}
      onToggleScorer={onToggleScorer}
      onBack={vi.fn()}
      onClose={vi.fn()}
      onNext={vi.fn()}
    />,
  );
  return onToggleScorer;
};

describe('ScorersStep · quién anota', () => {
  it('B1: cada registrado es un botón con su nombre que dice si anota', () => {
    pinta(['user-1']);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Yo/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('B2: pulsar el botón marca o desmarca a ese jugador', () => {
    const onToggle = pinta(['user-1']);

    fireEvent.click(screen.getByRole('button', { name: 'Ana' }));

    expect(onToggle).toHaveBeenCalledWith('user-2');
  });

  it('B3: quien anota lleva el móvil verde y el botón coloreado', () => {
    pinta(['user-1', 'user-2']);
    const ana = screen.getByRole('button', { name: 'Ana' });

    expect(
      within(ana).getByTestId('quick-match-scorer-anota'),
    ).toBeInTheDocument();
    expect(
      within(ana).queryByTestId('quick-match-scorer-no-anota'),
    ).not.toBeInTheDocument();
    expect(ana.className).toMatch(/bg-primary/);
  });

  it('B3: quien no anota lleva el móvil rojo tachado y el botón blanco', () => {
    pinta(['user-1']);
    const ana = screen.getByRole('button', { name: 'Ana' });

    const icono = within(ana).getByTestId('quick-match-scorer-no-anota');
    expect(icono.querySelector('[data-tachado]')).not.toBeNull();
    expect(
      within(ana).queryByTestId('quick-match-scorer-anota'),
    ).not.toBeInTheDocument();
    expect(ana.className).toMatch(/bg-white/);
    expect(ana.className).not.toMatch(/bg-primary/);
  });

  it('B4: tú anotas siempre: marcado, fijo y con «(tú)»', () => {
    const onToggle = pinta(['user-1']);
    const tu = screen.getByRole('button', { name: /Yo/ });

    expect(tu).toBeDisabled();
    expect(tu).toHaveTextContent('create.participants.creatorBadge');
    expect(
      within(tu).getByTestId('quick-match-scorer-anota'),
    ).toBeInTheDocument();
    fireEvent.click(tu);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
