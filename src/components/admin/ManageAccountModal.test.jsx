import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ManageAccountModal from './ManageAccountModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (key === 'manageModal.confirmDeleteWord') return 'DELETE';
      return params?.name ? `${key}_${params.name}` : key;
    },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...rest }) => {
      void initial; void animate; void transition;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const activeUser = {
  id: 'u1',
  firstName: 'Friend',
  lastName: 'Testing',
  isActive: true,
};

const inactiveUser = { ...activeUser, isActive: false };

describe('ManageAccountModal', () => {
  it('defaults to the deactivate option for an active user', () => {
    render(<ManageAccountModal user={activeUser} onToggleActive={vi.fn()} onDelete={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' })).toBeInTheDocument();
  });

  it('defaults to the reactivate option for an inactive user', () => {
    render(<ManageAccountModal user={inactiveUser} onToggleActive={vi.fn()} onDelete={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'manageModal.confirmReactivate' })).toBeInTheDocument();
  });

  it('calls onToggleActive when confirming the default deactivate option', async () => {
    const onToggleActive = vi.fn().mockResolvedValue();
    render(<ManageAccountModal user={activeUser} onToggleActive={onToggleActive} onDelete={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }));

    await waitFor(() => expect(onToggleActive).toHaveBeenCalled());
  });

  it('disables the confirm button for delete until DELETE is typed', () => {
    render(<ManageAccountModal user={activeUser} onToggleActive={vi.fn()} onDelete={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    const confirmButton = screen.getByRole('button', { name: 'manageModal.confirmDelete' });
    expect(confirmButton).toBeDisabled();

    const confirmInput = screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder');
    fireEvent.change(confirmInput, { target: { value: 'ELIMINAR' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
    expect(confirmButton).not.toBeDisabled();
  });

  it('calls onDelete once the confirmation word is typed and confirm is clicked', async () => {
    const onDelete = vi.fn().mockResolvedValue();
    render(<ManageAccountModal user={activeUser} onToggleActive={vi.fn()} onDelete={onDelete} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });

  it('shows the blocked message when onDelete rejects with a 409', async () => {
    const error = new Error('has created one or more quick matches');
    error.status = 409;
    const onDelete = vi.fn().mockRejectedValue(error);
    render(<ManageAccountModal user={activeUser} onToggleActive={vi.fn()} onDelete={onDelete} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    expect(await screen.findByText('manageModal.deleteBlockedTitle')).toBeInTheDocument();
    expect(screen.getByText('manageModal.deleteBlockedHint')).toBeInTheDocument();
  });

  it('shows a generic error for non-409 failures', async () => {
    const onToggleActive = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<ManageAccountModal user={activeUser} onToggleActive={onToggleActive} onDelete={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }));

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ManageAccountModal user={activeUser} onToggleActive={vi.fn()} onDelete={vi.fn()} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByRole('button', { name: 'manageModal.cancel' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(onCancel).toHaveBeenCalled();
  });
});
