import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileCard from './ProfileCard';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const user = {
  id: 'user-1',
  first_name: 'Ana',
  last_name: 'García',
  email: 'ana@example.com',
  handicap: 12.3,
  updated_at: '2026-07-30',
};

describe('ProfileCard', () => {
  it('renders the user name, email and handicap', () => {
    render(<ProfileCard user={user} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
    expect(screen.getByText('12.3')).toBeInTheDocument();
  });

  it('navigates to /profile/edit when the avatar is clicked', () => {
    render(<ProfileCard user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /change profile photo/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/profile/edit');
  });
});
