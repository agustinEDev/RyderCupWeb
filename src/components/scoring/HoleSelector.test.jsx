import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HoleSelector from './HoleSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('HoleSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render 18 hole buttons by default', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('hole-selector')).toBeInTheDocument();
    expect(screen.getByTestId('hole-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('hole-btn-18')).toBeInTheDocument();
  });

  it('should highlight current hole with ring class', () => {
    render(<HoleSelector currentHole={5} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('hole-btn-5').className).toContain('ring-2');
    expect(screen.getByTestId('hole-btn-1').className).not.toContain('ring-2');
  });

  it('should call onSelect when a hole is clicked', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('hole-btn-7'));
    expect(mockOnSelect).toHaveBeenCalledWith(7);
  });

  it('should show validated status with green class', () => {
    const scores = [{ holeNumber: 3, playerScores: [{ validationStatus: 'match' }] }];
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} scores={scores} />);
    expect(screen.getByTestId('hole-btn-3').className).toContain('bg-green-100');
  });

  it('should show mismatch status with red class', () => {
    const scores = [{ holeNumber: 5, playerScores: [{ validationStatus: 'mismatch' }] }];
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} scores={scores} />);
    expect(screen.getByTestId('hole-btn-5').className).toContain('bg-red-100');
  });

  it('should respect totalHoles prop', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} totalHoles={9} />);
    expect(screen.getByTestId('hole-btn-9')).toBeInTheDocument();
    expect(screen.queryByTestId('hole-btn-10')).toBeNull();
  });
});
