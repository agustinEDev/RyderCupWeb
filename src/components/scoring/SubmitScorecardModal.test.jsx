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

  /**
   * Con la entrega en vuelo el diálogo no se cierra por detrás —el jugador se
   * quedaría sin saber si su tarjeta salió— y además lo dice: un Escape que no
   * hace nada, sin más, no se puede explicar a un lector de pantalla.
   */
  it('mientras entrega, ni Escape ni el fondo cierran, y se anuncia ocupado', () => {
    const onClose = vi.fn();
    render(
      <SubmitScorecardModal
        isOpen={true}
        validatedHoles={18}
        totalHoles={18}
        isSubmitting={true}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByTestId('submit-scorecard-modal'));
    fireEvent.click(screen.getByTestId('submit-scorecard-modal'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('submit-scorecard-modal')).toHaveAttribute('aria-busy', 'true');
  });

  it('sin entrega en vuelo, Escape cierra y no hay nada ocupado', () => {
    const onClose = vi.fn();
    render(
      <SubmitScorecardModal
        isOpen={true}
        validatedHoles={18}
        totalHoles={18}
        isSubmitting={false}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('submit-scorecard-modal')).not.toHaveAttribute('aria-busy');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
