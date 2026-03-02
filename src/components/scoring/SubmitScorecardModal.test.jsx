import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubmitScorecardModal from './SubmitScorecardModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('SubmitScorecardModal', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<SubmitScorecardModal isOpen={false} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<SubmitScorecardModal isOpen={true} validatedHoles={18} totalHoles={18} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('submit-scorecard-modal')).toBeInTheDocument();
  });

  it('should call onConfirm when submit clicked', () => {
    const onConfirm = vi.fn();
    render(<SubmitScorecardModal isOpen={true} validatedHoles={18} totalHoles={18} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('submit-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should show submitting state', () => {
    render(<SubmitScorecardModal isOpen={true} validatedHoles={18} totalHoles={18} isSubmitting={true} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('submit-scorecard-modal')).toHaveTextContent('submit.submitting');
  });
});
