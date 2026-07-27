import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickMatchHoleSelector from './QuickMatchHoleSelector';

describe('QuickMatchHoleSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render 18 hole buttons by default', () => {
    render(<QuickMatchHoleSelector currentHole={1} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('quick-match-hole-selector')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-hole-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-hole-btn-18')).toBeInTheDocument();
  });

  it('should highlight the current hole', () => {
    render(<QuickMatchHoleSelector currentHole={5} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('quick-match-hole-btn-5').className).toContain('ring-2');
  });

  it('should call onSelect when a hole is clicked', () => {
    render(<QuickMatchHoleSelector currentHole={1} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('quick-match-hole-btn-7'));
    expect(mockOnSelect).toHaveBeenCalledWith(7);
  });

  it('should mark a hole as complete only when all covered participants have a score', () => {
    render(
      <QuickMatchHoleSelector
        currentHole={1}
        onSelect={mockOnSelect}
        coveredParticipantIds={['p-1', 'p-2']}
        holeScores={[
          { holeNumber: 3, participantId: 'p-1', score: 4 },
          { holeNumber: 3, participantId: 'p-2', score: 5 },
          { holeNumber: 4, participantId: 'p-1', score: 4 },
        ]}
      />
    );

    expect(screen.getByTestId('quick-match-hole-btn-3').className).toContain('bg-green-100');
    expect(screen.getByTestId('quick-match-hole-btn-4').className).toContain('bg-yellow-100');
    expect(screen.getByTestId('quick-match-hole-btn-5').className).toContain('bg-gray-100');
  });
});
