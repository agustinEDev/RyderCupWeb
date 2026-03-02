import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EarlyEndModal from './EarlyEndModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('EarlyEndModal', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<EarlyEndModal isOpen={false} decidedResult={{}} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const result = { winner: 'A', score: '5&4' };
    render(<EarlyEndModal isOpen={true} decidedResult={result} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('early-end-modal')).toBeInTheDocument();
  });

  it('should display decided result info', () => {
    const result = { winner: 'A', score: '5&4' };
    render(<EarlyEndModal isOpen={true} decidedResult={result} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('early-end-modal')).toHaveTextContent('earlyEnd.title');
  });

  it('should call onConfirm when button clicked', () => {
    const onConfirm = vi.fn();
    render(<EarlyEndModal isOpen={true} decidedResult={{}} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('early-end-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
