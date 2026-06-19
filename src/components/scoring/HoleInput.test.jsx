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

  it('should open panel on own score button click and select a value', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    // Panel is open — click button "5"
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('5');
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 5, markedScore: 4 });
  });

  it('should select a lower value via own score panel', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /3/ }));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('3');
  });

  it('should show dash when picked-up is selected', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByTestId('picked-up-button'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('-');
  });

  it('should open panel on marked score button click and select a value', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('marked-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('5');
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 4, markedScore: 5 });
  });

  it('should show read-only mode without buttons', () => {
    render(<HoleInput {...defaultProps} isReadOnly={true} playerScore={{ ownScore: 5, markerScore: 4 }} />);
    expect(screen.queryByTestId('own-score-button')).toBeNull();
    expect(screen.queryByTestId('marked-score-button')).toBeNull();
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

  it('should hide own score button when isOwnScoreLocked, keep marked button visible', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    expect(screen.queryByTestId('own-score-button')).toBeNull();
    expect(screen.getByTestId('marked-score-button')).toBeInTheDocument();
  });

  it('should hide marked score button when isMarkerScoreLocked, keep own button visible', () => {
    render(<HoleInput {...defaultProps} isMarkerScoreLocked={true} />);
    expect(screen.getByTestId('own-score-button')).toBeInTheDocument();
    expect(screen.queryByTestId('marked-score-button')).toBeNull();
  });

  it('should trigger onScoreChange with correct ownScore when only marker changes', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    fireEvent.click(screen.getByTestId('marked-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 4, markedScore: 5 });
  });

  it('should fallback to letter when team name not provided', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'A', standing: '1UP', standingTeam: 'A' }} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('A');
  });
});
