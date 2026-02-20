import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('OfflineBanner', () => {
  it('should render offline message', () => {
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('offline.banner');
  });

  it('should show pending count when > 0', () => {
    render(<OfflineBanner pendingCount={3} />);
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('offline.pendingScores');
  });

  it('should not show pending count when 0', () => {
    render(<OfflineBanner pendingCount={0} />);
    expect(screen.getByTestId('offline-banner')).not.toHaveTextContent('offline.pendingScores');
  });
});
