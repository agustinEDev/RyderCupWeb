import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamStandingsHeader from './TeamStandingsHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('TeamStandingsHeader', () => {
  it('should display team names and points', () => {
    render(<TeamStandingsHeader teamAName="Red" teamBName="Blue" teamAPoints={4.5} teamBPoints={3.5} />);
    const header = screen.getByTestId('team-standings-header');
    expect(header).toHaveTextContent('Red');
    expect(header).toHaveTextContent('Blue');
    expect(header).toHaveTextContent('4.5');
    expect(header).toHaveTextContent('3.5');
  });

  it('should default null points to 0', () => {
    render(<TeamStandingsHeader teamAName="Red" teamBName="Blue" />);
    const header = screen.getByTestId('team-standings-header');
    expect(header).toHaveTextContent('0');
  });

  it('should display vs separator', () => {
    render(<TeamStandingsHeader teamAName="A" teamBName="B" teamAPoints={0} teamBPoints={0} />);
    expect(screen.getByTestId('team-standings-header')).toHaveTextContent('vs');
  });

  it('should display translation key for points label', () => {
    render(<TeamStandingsHeader teamAName="A" teamBName="B" teamAPoints={1} teamBPoints={2} />);
    expect(screen.getByTestId('team-standings-header')).toHaveTextContent('leaderboard.points');
  });
});
