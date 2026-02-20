import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HoleInput from './HoleInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('HoleInput', () => {
  const defaultProps = {
    holeNumber: 5,
    par: 4,
    strokeIndex: 7,
    onScoreChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render hole info', () => {
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('5');
    expect(screen.getByTestId('hole-input')).toHaveTextContent('4');
    expect(screen.getByTestId('hole-input')).toHaveTextContent('7');
  });

  it('should show par as default score value', () => {
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('4');
    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('4');
  });

  it('should increment own score on plus click', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-plus'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('5');
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 5, markedScore: 4 });
  });

  it('should decrement own score on minus click', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-minus'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('3');
  });

  it('should show dash when score goes below 1 (picked up)', () => {
    render(<HoleInput {...defaultProps} playerScore={{ ownScore: 1, markerScore: 4 }} />);
    fireEvent.click(screen.getByTestId('own-score-minus'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('-');
  });

  it('should not exceed 9', () => {
    render(<HoleInput {...defaultProps} playerScore={{ ownScore: 9, markerScore: 4 }} />);
    fireEvent.click(screen.getByTestId('own-score-plus'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('9');
  });

  it('should increment marked score', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('marked-score-plus'));
    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('5');
  });

  it('should show read-only mode without buttons', () => {
    render(<HoleInput {...defaultProps} isReadOnly={true} playerScore={{ ownScore: 5, markerScore: 4 }} />);
    expect(screen.queryByTestId('own-score-minus')).toBeNull();
    expect(screen.queryByTestId('own-score-plus')).toBeNull();
  });

  it('should show net score when provided', () => {
    render(<HoleInput {...defaultProps} netScore={3} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('3');
  });

  it('should show standing', () => {
    render(<HoleInput {...defaultProps} standing="2UP" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('2UP');
  });

  it('should show all square for AS standing', () => {
    render(<HoleInput {...defaultProps} standing="AS" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.allSquare');
  });

  it('should show strokes received badge', () => {
    render(<HoleInput {...defaultProps} strokesReceived={1} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.strokeReceived');
  });
});
