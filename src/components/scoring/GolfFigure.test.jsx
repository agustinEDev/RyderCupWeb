import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GolfFigure from './GolfFigure';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('GolfFigure', () => {
  it('should render eagle for score 2 under par', () => {
    render(<GolfFigure score={2} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.eagle');
    expect(fig.querySelector('circle')).not.toBeNull();
  });

  it('should render birdie for score 1 under par', () => {
    render(<GolfFigure score={3} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.birdie');
    expect(fig.querySelector('circle')).not.toBeNull();
  });

  it('should render par for score equal to par', () => {
    render(<GolfFigure score={4} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.par');
    expect(fig).toHaveTextContent('4');
    expect(fig.querySelector('svg')).toBeNull();
  });

  it('should render bogey for score 1 over par', () => {
    render(<GolfFigure score={5} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.bogey');
    expect(fig.querySelector('rect')).not.toBeNull();
  });

  it('should render double bogey for score 2+ over par', () => {
    render(<GolfFigure score={7} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.doubleBogey');
    expect(fig.querySelectorAll('rect').length).toBe(2);
  });

  it('should render dash for null score', () => {
    render(<GolfFigure score={null} par={4} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveTextContent('-');
  });

  it('should render dash for undefined par', () => {
    render(<GolfFigure score={4} par={undefined} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveTextContent('-');
  });

  it('should render ace as eagle', () => {
    render(<GolfFigure score={1} par={3} />);
    const fig = screen.getByTestId('golf-figure');
    expect(fig).toHaveAttribute('title', 'figures.eagle');
    expect(fig.querySelector('circle')).not.toBeNull();
  });
});
