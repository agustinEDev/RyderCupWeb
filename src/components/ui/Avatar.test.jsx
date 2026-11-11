import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders placeholder icon when no userId is given', () => {
    render(<Avatar />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an img pointing at the user avatar endpoint', () => {
    render(<Avatar userId="abc-123" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img.src).toContain('/api/v1/users/abc-123/avatar');
  });

  it('appends the version as a cache-busting query param when given', () => {
    render(<Avatar userId="abc-123" version="2026-07-29T10:00:00Z" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img.src).toContain('?v=');
  });

  it('falls back to the placeholder icon when the image fails to load', () => {
    render(<Avatar userId="abc-123" />);
    const img = screen.getByRole('img', { hidden: true });

    fireEvent.error(img);

    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('retries (resets the error state) when userId changes after a failed load', () => {
    const { rerender } = render(<Avatar userId="abc-123" />);
    fireEvent.error(screen.getByRole('img', { hidden: true }));
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();

    rerender(<Avatar userId="different-user" />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img.src).toContain('/api/v1/users/different-user/avatar');
  });

  it('retries (resets the error state) when version changes after a failed load', () => {
    const { rerender } = render(<Avatar userId="abc-123" version="v1" />);
    fireEvent.error(screen.getByRole('img', { hidden: true }));
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();

    rerender(<Avatar userId="abc-123" version="v2" />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img.src).toContain('v=v2');
  });

  it('applies the requested size class', () => {
    const { container } = render(<Avatar userId="abc-123" size="lg" />);
    expect(container.firstChild.className).toContain('w-24');
  });

  // FE-03: un id que no vale para una ruta («.», «..», vacío) no rompe la pantalla: el icono
  it.each(['.', '..'])('with an id that is not a valid path segment (%j) it shows the placeholder', (id) => {
    const { container } = render(<Avatar userId={id} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('encodes the user id in the image path', () => {
    const { container } = render(<Avatar userId="a?c#d" />);
    expect(container.querySelector('img').getAttribute('src')).toContain('/api/v1/users/a%3Fc%23d/avatar');
  });
});
