import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InvitationBadge from './InvitationBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

describe('InvitationBadge', () => {
  it('should render with PENDING status', () => {
    render(<InvitationBadge status="PENDING" />);
    const badge = screen.getByTestId('invitation-badge');
    expect(badge).toHaveTextContent('status.PENDING');
    expect(badge.className).toContain('bg-yellow-100');
  });

  it('should render with ACCEPTED status', () => {
    render(<InvitationBadge status="ACCEPTED" />);
    const badge = screen.getByTestId('invitation-badge');
    expect(badge.className).toContain('bg-green-100');
  });

  it('should render with DECLINED status', () => {
    render(<InvitationBadge status="DECLINED" />);
    const badge = screen.getByTestId('invitation-badge');
    expect(badge.className).toContain('bg-red-100');
  });

  it('should render with EXPIRED status', () => {
    render(<InvitationBadge status="EXPIRED" />);
    const badge = screen.getByTestId('invitation-badge');
    expect(badge.className).toContain('bg-gray-100');
  });
});
