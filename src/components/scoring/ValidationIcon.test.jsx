import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValidationIcon from './ValidationIcon';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('ValidationIcon', () => {
  it('should render match icon with green class', () => {
    render(<ValidationIcon status="match" />);
    const icon = screen.getByTestId('validation-icon');
    expect(icon.className).toContain('text-green-600');
    expect(icon).toHaveTextContent('\u2713');
  });

  it('should render mismatch icon with red class', () => {
    render(<ValidationIcon status="mismatch" />);
    const icon = screen.getByTestId('validation-icon');
    expect(icon.className).toContain('text-red-600');
    expect(icon).toHaveTextContent('\u2717');
  });

  it('should render pending icon with gray class', () => {
    render(<ValidationIcon status="pending" />);
    const icon = screen.getByTestId('validation-icon');
    expect(icon.className).toContain('text-gray-400');
    expect(icon).toHaveTextContent('\u25EF');
  });

  it('should default to pending for undefined status', () => {
    render(<ValidationIcon />);
    const icon = screen.getByTestId('validation-icon');
    expect(icon.className).toContain('text-gray-400');
    expect(icon).toHaveTextContent('\u25EF');
  });

  it('should show title from translation keys', () => {
    render(<ValidationIcon status="match" />);
    const icon = screen.getByTestId('validation-icon');
    expect(icon).toHaveAttribute('title', 'validation.match');
  });
});
