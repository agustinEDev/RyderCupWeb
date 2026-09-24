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

  it('A3: sin plaza tiene su texto y su color, no el gris de un estado desconocido (#710)', () => {
    render(<InvitationBadge status="NO_ROOM" />);
    const etiqueta = screen.getByTestId('invitation-badge');
    expect(etiqueta).toHaveTextContent('status.NO_ROOM');
    expect(etiqueta.className).toContain('bg-orange-100');
  });

  it('A3b: las dos traducciones existen', async () => {
    for (const idioma of ['es', 'en']) {
      const textos = (await import(`../../i18n/locales/${idioma}/invitations.json`)).default;
      expect(textos.status.NO_ROOM, idioma).toBeTruthy();
      expect(textos.creator.enrollmentClosed, idioma).toBeTruthy();
    }
  });
});
