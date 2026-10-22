import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import PlayerProfileMenu from './PlayerProfileMenu';

const t = (key) => key;

const renderMenu = (props = {}) => {
  const onRemove = vi.fn();
  const onBlock = vi.fn();
  render(
    <div>
      <PlayerProfileMenu isFriend onRemove={onRemove} onBlock={onBlock} t={t} {...props} />
      <button type="button">fuera</button>
    </div>
  );
  return { onRemove, onBlock };
};

const abre = async () => {
  fireEvent.click(screen.getByTestId('player-profile-menu'));
  return screen.findByRole('menu');
};

describe('PlayerProfileMenu keyboard and focus (review FE-2)', () => {
  it('moves focus to the first item when it opens', async () => {
    renderMenu();
    await abre();

    await waitFor(() => expect(screen.getByTestId('player-profile-menu-remove')).toHaveFocus());
  });

  it('focuses the only item when there is one', async () => {
    renderMenu({ isFriend: false });
    await abre();

    await waitFor(() => expect(screen.getByTestId('player-profile-menu-block')).toHaveFocus());
  });

  it('moves with the arrows and wraps around', async () => {
    renderMenu();
    const menu = await abre();
    const quitar = screen.getByTestId('player-profile-menu-remove');
    const bloquear = screen.getByTestId('player-profile-menu-block');
    await waitFor(() => expect(quitar).toHaveFocus());

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(bloquear).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(quitar).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(bloquear).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(quitar).toHaveFocus();
  });

  it('jumps to the first and last item with Home and End', async () => {
    renderMenu();
    const menu = await abre();
    await waitFor(() => expect(screen.getByTestId('player-profile-menu-remove')).toHaveFocus());

    fireEvent.keyDown(menu, { key: 'End' });
    expect(screen.getByTestId('player-profile-menu-block')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(screen.getByTestId('player-profile-menu-remove')).toHaveFocus();
  });

  it('closes with Escape and gives the focus back to the «⋯» button', async () => {
    const { onRemove, onBlock } = renderMenu();
    await abre();

    fireEvent.keyDown(screen.getByTestId('player-profile-menu-remove'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByTestId('player-profile-menu')).toHaveFocus();
    expect(onRemove).not.toHaveBeenCalled();
    expect(onBlock).not.toHaveBeenCalled();
  });

  it('closes when Tab leaves it', async () => {
    renderMenu();
    const menu = await abre();

    fireEvent.keyDown(menu, { key: 'Tab' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes when you click outside, without doing anything', async () => {
    const { onRemove, onBlock } = renderMenu();
    await abre();

    fireEvent.mouseDown(screen.getByText('fuera'));

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(onRemove).not.toHaveBeenCalled();
    expect(onBlock).not.toHaveBeenCalled();
  });

  it('runs the chosen action and closes', async () => {
    const { onBlock } = renderMenu();
    await abre();

    fireEvent.click(screen.getByTestId('player-profile-menu-block'));

    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
