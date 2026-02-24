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

  it('should show standing with team name', () => {
    render(<HoleInput {...defaultProps} standing="2UP" holeResult={{ winner: 'A', standing: '2UP', standingTeam: 'A' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('Europe 2UP');
  });

  it('should show all square for AS standing', () => {
    render(<HoleInput {...defaultProps} standing="AS" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.allSquare');
  });

  it('should show strokes received badge', () => {
    render(<HoleInput {...defaultProps} strokesReceived={1} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.strokeReceived');
  });

  it('should show team A name for hole winner A', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'A', standing: '1UP', standingTeam: 'A' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('Europe');
  });

  it('should show team B name for hole winner B', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'B', standing: '1UP', standingTeam: 'B' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('USA');
  });

  it('should show halved for HALVED result', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'HALVED', standing: 'AS', standingTeam: null }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.halved');
  });

  it('should lock own score but keep marker editable when isOwnScoreLocked', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    // Own score buttons should not exist
    expect(screen.queryByTestId('own-score-minus')).toBeNull();
    expect(screen.queryByTestId('own-score-plus')).toBeNull();
    // Marker score buttons should still exist
    expect(screen.getByTestId('marked-score-minus')).toBeInTheDocument();
    expect(screen.getByTestId('marked-score-plus')).toBeInTheDocument();
  });

  it('should lock marker score but keep own editable when isMarkerScoreLocked', () => {
    render(<HoleInput {...defaultProps} isMarkerScoreLocked={true} />);
    // Own score buttons should exist
    expect(screen.getByTestId('own-score-minus')).toBeInTheDocument();
    expect(screen.getByTestId('own-score-plus')).toBeInTheDocument();
    // Marker score buttons should not exist
    expect(screen.queryByTestId('marked-score-minus')).toBeNull();
    expect(screen.queryByTestId('marked-score-plus')).toBeNull();
  });

  it('should still trigger onScoreChange when only marker score changes', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    fireEvent.click(screen.getByTestId('marked-score-plus'));
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 4, markedScore: 5 });
  });

  it('should fallback to letter when team name not provided', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'A', standing: '1UP', standingTeam: 'A' }} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('A');
  });
});
