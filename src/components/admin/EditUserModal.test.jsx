import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EditUserModal from './EditUserModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
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

const user = {
  id: 'u1',
  firstName: 'Agus',
  lastName: 'Estevez',
  email: 'agus@test.com',
  handicap: 17.7,
  isAdmin: false,
};

describe('EditUserModal', () => {
  it('pre-fills the form with the user data', () => {
    render(<EditUserModal user={user} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByDisplayValue('Agus')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Estevez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('agus@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17.7')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EditUserModal user={user} onSubmit={vi.fn()} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByRole('button', { name: 'editModal.cancel' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(onCancel).toHaveBeenCalled();
  });

  it('submits the edited fields, converting handicap to a number', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<EditUserModal user={user} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('Agus'), { target: { value: 'Agustin' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.firstName).toBe('Agustin');
    expect(payload.handicap).toBe(17.7);
    expect(payload.isAdmin).toBe(true);
  });

  it('sends handicap as undefined when the field is cleared', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<EditUserModal user={user} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('17.7'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].handicap).toBeUndefined();
  });

  it('shows an error message when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Email already in use'));
    render(<EditUserModal user={user} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
