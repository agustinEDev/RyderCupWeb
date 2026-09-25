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
    expect(screen.getByTestId('pre-match-info')).not.toHaveTextContent('Maria');
  });

  it('should display match format', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="FOURBALL" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('FOURBALL');
  });

  it('should return null when no marker assignment', () => {
    const { container } = render(<PreMatchInfo markerAssignment={null} matchFormat="SINGLES" currentUserId="u1" />);
    expect(container.firstChild).toBeNull();
  });

  it('should hide youMark section if marksName not provided', () => {
    const partial = { markedByName: 'Maria' };
    render(<PreMatchInfo markerAssignment={partial} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).not.toHaveTextContent('preMatch.youMark');
  });

  it('should not show markedBy row', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).not.toHaveTextContent('preMatch.markedBy');
    expect(screen.getByTestId('pre-match-info')).not.toHaveTextContent('Maria');
  });

  it('should show translation keys', () => {
    render(<PreMatchInfo markerAssignment={assignment} matchFormat="SINGLES" currentUserId="u1" />);
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('preMatch.title');
    expect(screen.getByTestId('pre-match-info')).toHaveTextContent('preMatch.youMark');
  });

  // #710: en foursomes se juega una bola por pareja y se marca a la pareja
  // rival. «Tú marcas a Luna» hacía dudar (Agustín, e2e del 24 sep)
  describe('foursomes', () => {
    const JUGADORES = [
      { userId: 'u1', userName: 'Nacho Noche', team: 'A' },
      { userId: 'u2', userName: 'Agustín Estévez', team: 'A' },
      { userId: 'u3', userName: 'Luna Noche', team: 'B' },
      { userId: 'u4', userName: 'Óscar Noche', team: 'B' },
    ];
    const marca = { marksUserId: 'u3', marksName: 'Luna Noche' };

    it('F1: marcáis a la pareja rival, con los dos nombres', () => {
      render(
        <PreMatchInfo markerAssignment={marca} matchFormat="FOURSOMES" players={JUGADORES} />
      );

      const info = screen.getByTestId('pre-match-info');
      expect(info).toHaveTextContent('preMatch.youMarkPair');
      expect(info).toHaveTextContent('Luna Noche / Óscar Noche');
      expect(info).not.toHaveTextContent('preMatch.youMark:');
    });

    it('F2b: en fourball, cada uno su bola: se marca a una persona', () => {
      render(<PreMatchInfo markerAssignment={marca} matchFormat="FOURBALL" players={JUGADORES} />);

      const info = screen.getByTestId('pre-match-info');
      expect(info).not.toHaveTextContent('preMatch.youMarkPair');
      expect(info).not.toHaveTextContent('Óscar Noche');
    });

    it('F2: en individuales sigue siendo una persona', () => {
      render(<PreMatchInfo markerAssignment={marca} matchFormat="SINGLES" players={JUGADORES} />);

      const info = screen.getByTestId('pre-match-info');
      expect(info).toHaveTextContent('preMatch.youMark');
      expect(info).not.toHaveTextContent('Óscar Noche');
    });
  });
});
