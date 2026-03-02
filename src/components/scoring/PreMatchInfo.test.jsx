import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreMatchInfo from './PreMatchInfo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('PreMatchInfo', () => {
  const assignment = {
    marksName: 'Pedro',
    markedByName: 'Maria',
  };

  it('should render pre-match info with marker assignment', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).toBeInTheDocument();
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('Pedro');
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('Maria');
  });

  it('should display match format', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="FOURBALL" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('FOURBALL');
  });

  it('should return null when no marker assignment', () => {
    const { container } = render(<PreMatchInfo markerAssignment={null} matchFormat="SINGLES" currentUserId="u1" />);
    expect(container.firstChild).toBeNull();
  });

  it('should hide marksName section if not provided', () => {
    const partial = { markedByName: 'Maria' };
    render(<PreMatchInfo markerAssignment={partial} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).not.toHaveTextContent('preMatch.youMark');
  });

  it('should show translation keys', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('preMatch.title');
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('preMatch.youMark');
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('preMatch.markedBy');
  });
});
