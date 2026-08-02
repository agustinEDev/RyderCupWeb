import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminUsersTable from './AdminUsersTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

const baseUser = {
  id: 'u1',
  firstName: 'Agus',
  lastName: 'Estevez',
  email: 'agus@test.com',
  handicap: 17.7,
  isAdmin: false,
  isActive: true,
  createdAt: '2026-07-27T00:00:00Z',
};

describe('AdminUsersTable', () => {
  it('renders the empty state when there are no users', () => {
    render(<AdminUsersTable users={[]} onEdit={vi.fn()} onToggleActive={vi.fn()} onManageDelete={vi.fn()} />);

    expect(screen.getByText('users.noResults')).toBeInTheDocument();
  });

  it('renders a row per user with name, email and handicap', () => {
    render(
      <AdminUsersTable
        users={[baseUser]}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
        onManageDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Agus Estevez')).toBeInTheDocument();
    expect(screen.getByText('agus@test.com')).toBeInTheDocument();
    expect(screen.getByText('17.7')).toBeInTheDocument();
  });

  it('shows a dash when handicap is null', () => {
    render(
      <AdminUsersTable
        users={[{ ...baseUser, handicap: null }]}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
        onManageDelete={vi.fn()}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the admin role pill for admins and player pill otherwise', () => {
    const { rerender } = render(
      <AdminUsersTable
        users={[baseUser]}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
        onManageDelete={vi.fn()}
      />
    );
    expect(screen.getByText('users.rolePlayer')).toBeInTheDocument();

    rerender(
      <AdminUsersTable
        users={[{ ...baseUser, isAdmin: true }]}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
        onManageDelete={vi.fn()}
      />
    );
    expect(screen.getByText('users.roleAdmin')).toBeInTheDocument();
  });

  it('shows the deactivated status pill for inactive users', () => {
    render(
      <AdminUsersTable
        users={[{ ...baseUser, isActive: false }]}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
        onManageDelete={vi.fn()}
      />
    );

    expect(screen.getByText('users.statusInactive')).toBeInTheDocument();
  });

  it('calls onEdit with the user when the edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <AdminUsersTable users={[baseUser]} onEdit={onEdit} onToggleActive={vi.fn()} onManageDelete={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));

    expect(onEdit).toHaveBeenCalledWith(baseUser);
  });

  it('calls onToggleActive with the user when the deactivate button is clicked', () => {
    const onToggleActive = vi.fn();
    render(
      <AdminUsersTable users={[baseUser]} onEdit={vi.fn()} onToggleActive={onToggleActive} onManageDelete={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'users.deactivateTooltip' }));

    expect(onToggleActive).toHaveBeenCalledWith(baseUser);
  });

  it('shows the reactivate action for inactive users', () => {
    const onToggleActive = vi.fn();
    const inactiveUser = { ...baseUser, isActive: false };
    render(
      <AdminUsersTable
        users={[inactiveUser]}
        onEdit={vi.fn()}
        onToggleActive={onToggleActive}
        onManageDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'users.reactivateTooltip' }));

    expect(onToggleActive).toHaveBeenCalledWith(inactiveUser);
  });

  it('calls onManageDelete with the user when the manage button is clicked', () => {
    const onManageDelete = vi.fn();
    render(
      <AdminUsersTable users={[baseUser]} onEdit={vi.fn()} onToggleActive={vi.fn()} onManageDelete={onManageDelete} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'users.deleteTooltip' }));

    expect(onManageDelete).toHaveBeenCalledWith(baseUser);
  });
});
