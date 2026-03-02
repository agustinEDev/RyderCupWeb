import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionBlockedModal from './SessionBlockedModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('SessionBlockedModal', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<SessionBlockedModal isOpen={false} onTakeOver={vi.fn()} onGoBack={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<SessionBlockedModal isOpen={true} onTakeOver={vi.fn()} onGoBack={vi.fn()} />);
    expect(screen.getByTestId('session-blocked-modal')).toBeInTheDocument();
    expect(screen.getByTestId('session-blocked-modal')).toHaveTextContent('session.blocked');
  });

  it('should call callbacks on button clicks', () => {
    const onTakeOver = vi.fn();
    const onGoBack = vi.fn();
    render(<SessionBlockedModal isOpen={true} onTakeOver={onTakeOver} onGoBack={onGoBack} />);
    fireEvent.click(screen.getByTestId('session-take-over'));
    expect(onTakeOver).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('session-go-back'));
    expect(onGoBack).toHaveBeenCalled();
  });
});
