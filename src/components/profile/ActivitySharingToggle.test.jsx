import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActivitySharingToggle from './ActivitySharingToggle';

vi.mock('../../composition', () => ({
  setActivitySharingUseCase: { execute: vi.fn() },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

import { setActivitySharingUseCase } from '../../composition';
import customToast from '../../utils/toast';

/**
 * Interruptor de publicacion de logros (BE #175).
 */
describe('ActivitySharingToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paints the state it was given', () => {
    render(<ActivitySharingToggle initialValue={false} />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('assumes it is on when the backend sends no value', () => {
    // Un backend anterior a este campo no lo manda. Pintar "apagado" haria
    // creer que no se esta publicando cuando si.
    render(<ActivitySharingToggle initialValue={undefined} />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('turns on without asking anything', async () => {
    setActivitySharingUseCase.execute.mockResolvedValue({
      shareActivity: true,
      removedEvents: 0,
    });

    render(<ActivitySharingToggle initialValue={false} />);
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(setActivitySharingUseCase.execute).toHaveBeenCalledWith(true);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before turning off, and does not call anything until confirmed', () => {
    render(<ActivitySharingToggle initialValue={true} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(setActivitySharingUseCase.execute).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('turns off once confirmed and says how much was removed', async () => {
    setActivitySharingUseCase.execute.mockResolvedValue({
      shareActivity: false,
      removedEvents: 4,
    });

    render(<ActivitySharingToggle initialValue={true} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'privacy.confirmOffAction' }));

    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });
    expect(setActivitySharingUseCase.execute).toHaveBeenCalledWith(false);
    expect(customToast.success).toHaveBeenCalledWith('privacy.turnedOff');
  });

  it('leaves the switch where it was when saving fails', async () => {
    // El estado solo cambia cuando el backend confirma: un interruptor que se
    // mueve y se queda ahi diria que se dejo de publicar sin haberlo hecho.
    setActivitySharingUseCase.execute.mockRejectedValue(new Error('boom'));

    render(<ActivitySharingToggle initialValue={true} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'privacy.confirmOffAction' }));

    await waitFor(() => {
      expect(customToast.error).toHaveBeenCalledWith('privacy.saveFailed');
    });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('reports the new value to whoever owns the user', async () => {
    setActivitySharingUseCase.execute.mockResolvedValue({
      shareActivity: false,
      removedEvents: 0,
    });
    const onChange = vi.fn();

    render(<ActivitySharingToggle initialValue={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'privacy.confirmOffAction' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(false);
    });
  });
});
