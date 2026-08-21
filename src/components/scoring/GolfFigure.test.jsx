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

  describe('raya (bola recogida)', () => {
    it('la pinta distinta del hoyo sin anotar', () => {
      // Con el mismo guion gris para los dos, quien mira la tarjeta no sabe si
      // al hoyo le falta el golpe o si ya esta cerrado.
      const { unmount } = render(<GolfFigure score={null} par={4} pickedUp />);
      const raya = screen.getByTestId('golf-figure');
      expect(raya).toHaveAttribute('data-picked-up', 'true');
      expect(raya).toHaveAttribute('title', 'input.pickedUpLabel');
      unmount();

      render(<GolfFigure score={null} par={4} />);
      expect(screen.getByTestId('golf-figure')).not.toHaveAttribute('data-picked-up');
    });

    it('manda sobre el numero si llegan los dos', () => {
      // El numero que acompana a una raya es el doble bogey neto con el que
      // cuenta, no un golpe que se diera: en pantalla va la raya.
      render(<GolfFigure score={6} par={4} pickedUp />);
      const fig = screen.getByTestId('golf-figure');
      expect(fig).toHaveAttribute('data-picked-up', 'true');
      expect(fig).not.toHaveTextContent('6');
    });
  });
});
