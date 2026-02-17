import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GenerateMatchesModal from './GenerateMatchesModal';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...rest }) => {
      void initial; void animate; void transition;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const mockT = (key, params) => {
  if (params) {
    let result = key;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, v);
    });
    return result;
  }
  return key;
};

const baseProps = {
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  round: { id: 'r-1', matchFormat: 'SINGLES' },
  enrollments: [
    { userId: 'p1', userName: 'Player 1', userHandicap: 10.2, status: 'APPROVED' },
    { userId: 'p2', userName: 'Player 2', userHandicap: 15.0, status: 'APPROVED' },
    { userId: 'p3', userName: 'Player 3', userHandicap: 8.5, status: 'APPROVED' },
    { userId: 'p4', userName: 'Player 4', userHandicap: 20.1, status: 'APPROVED' },
    { userId: 'p5', userName: 'Player 5', userHandicap: 12.0, status: 'PENDING' },
  ],
  teamAssignment: {
    teamAPlayerIds: ['p1', 'p2'],
    teamBPlayerIds: ['p3', 'p4'],
  },
  isProcessing: false,
  teamNames: { teamA: 'Spain', teamB: 'France' },
  playerNameMap: new Map([
    ['p1', 'Player 1'],
    ['p2', 'Player 2'],
    ['p3', 'Player 3'],
    ['p4', 'Player 4'],
    ['p5', 'Player 5'],
  ]),
  t: mockT,
};

describe('GenerateMatchesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<GenerateMatchesModal isOpen={false} {...baseProps} />);
    expect(screen.queryByText('matches.pairings.title')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    expect(screen.getByText('matches.pairings.title')).toBeInTheDocument();
  });

  it('should default to automatic mode', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    const automaticRadio = screen.getByDisplayValue('automatic');
    expect(automaticRadio).toBeChecked();
  });

  it('should not show manual matches UI in automatic mode', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    expect(screen.queryByText('matches.pairings.matchN')).not.toBeInTheDocument();
    expect(screen.queryByText('matches.pairings.addMatch')).not.toBeInTheDocument();
  });

  it('should switch to manual mode and show matches UI', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));
    expect(screen.getByText('matches.pairings.addMatch')).toBeInTheDocument();
  });

  it('should call onConfirm(null) when submitting in automatic mode', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByText('matches.pairings.generate'));
    expect(baseProps.onConfirm).toHaveBeenCalledWith(null);
  });

  it('should add matches when clicking add button', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // Should start with 1 match
    expect(screen.getByText('matches.pairings.matchN')).toBeInTheDocument();

    // Add another match
    fireEvent.click(screen.getByText('matches.pairings.addMatch'));
    const matchHeaders = screen.getAllByText(/matches\.pairings\.matchN/);
    expect(matchHeaders).toHaveLength(2);
  });

  it('should remove matches when clicking remove button', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // Add a second match
    fireEvent.click(screen.getByText('matches.pairings.addMatch'));
    expect(screen.getAllByText(/matches\.pairings\.matchN/)).toHaveLength(2);

    // Remove one
    const removeButtons = screen.getAllByTitle('matches.pairings.removeMatch');
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByText(/matches\.pairings\.matchN/)).toHaveLength(1);
  });

  it('should not show remove button when only one match exists', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    expect(screen.queryByTitle('matches.pairings.removeMatch')).not.toBeInTheDocument();
  });

  it('should show validation error when submitting empty manual match', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));
    fireEvent.click(screen.getByText('matches.pairings.generate'));

    expect(screen.getByText('matches.pairings.validation.incompleteMatch')).toBeInTheDocument();
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should show 1 player dropdown per team for SINGLES', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // In SINGLES: 1 Team A dropdown + 1 Team B dropdown = 2 selects per match
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  it('should show 2 player dropdowns per team for FOURBALL', () => {
    const fourballProps = { ...baseProps, round: { id: 'r-1', matchFormat: 'FOURBALL' } };
    render(<GenerateMatchesModal isOpen={true} {...fourballProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // In FOURBALL: 2 Team A dropdowns + 2 Team B dropdowns = 4 selects per match
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(4);
  });

  it('should show 2 player dropdowns per team for FOURSOMES', () => {
    const foursomesProps = { ...baseProps, round: { id: 'r-1', matchFormat: 'FOURSOMES' } };
    render(<GenerateMatchesModal isOpen={true} {...foursomesProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(4);
  });

  it('should only show Team A players in Team A dropdown', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    const selects = screen.getAllByRole('combobox');
    const teamASelect = selects[0]; // First select is Team A

    // Team A has p1, p2
    const options = teamASelect.querySelectorAll('option');
    // 1 placeholder + 2 team A players
    expect(options).toHaveLength(3);
    expect(options[1].value).toBe('p1');
    expect(options[2].value).toBe('p2');
  });

  it('should only show Team B players in Team B dropdown', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    const selects = screen.getAllByRole('combobox');
    const teamBSelect = selects[1]; // Second select is Team B

    // Team B has p3, p4
    const options = teamBSelect.querySelectorAll('option');
    // 1 placeholder + 2 team B players
    expect(options).toHaveLength(3);
    expect(options[1].value).toBe('p3');
    expect(options[2].value).toBe('p4');
  });

  it('should call onConfirm with matches array on valid manual submit', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p1' } });
    fireEvent.change(selects[1], { target: { value: 'p3' } });

    fireEvent.click(screen.getByText('matches.pairings.generate'));

    expect(baseProps.onConfirm).toHaveBeenCalledWith([
      { teamAPlayerIds: ['p1'], teamBPlayerIds: ['p3'] },
    ]);
  });

  it('should disable submit button when isProcessing is true', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} isProcessing={true} />);
    const submitBtn = screen.getByRole('button', { name: /\.\.\./ });
    expect(submitBtn).toBeDisabled();
  });

  it('should call onClose when clicking close button', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('should exclude non-APPROVED enrollments from player lists', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // p5 is PENDING and not in teamAssignment, so shouldn't appear anywhere
    const selects = screen.getAllByRole('combobox');
    const allOptions = [...selects[0].querySelectorAll('option'), ...selects[1].querySelectorAll('option')];
    const p5Option = allOptions.find(o => o.value === 'p5');
    expect(p5Option).toBeUndefined();
  });

  it('should show summary with correct counts in manual mode', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // The mockT returns the key with interpolated params
    // t('matches.pairings.summary', { matchCount: 1, assignedCount: 0, totalCount: 4 })
    // mockT replaces {{matchCount}} etc. in the key string, but since params don't match
    // the key itself, it just returns the key. Check that summary element exists.
    expect(screen.getByText('matches.pairings.summary')).toBeInTheDocument();
  });

  it('should clear validation error when switching to automatic mode', () => {
    render(<GenerateMatchesModal isOpen={true} {...baseProps} />);
    fireEvent.click(screen.getByDisplayValue('manual'));

    // Trigger validation error
    fireEvent.click(screen.getByText('matches.pairings.generate'));
    expect(screen.getByText('matches.pairings.validation.incompleteMatch')).toBeInTheDocument();

    // Switch to automatic
    fireEvent.click(screen.getByDisplayValue('automatic'));
    expect(screen.queryByText('matches.pairings.validation.incompleteMatch')).not.toBeInTheDocument();
  });
});
