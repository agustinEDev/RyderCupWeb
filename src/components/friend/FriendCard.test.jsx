import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import FriendCard from './FriendCard';

vi.mock('../ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

vi.mock('./FriendshipBadge', () => ({
  default: ({ status }) => <span>{status}</span>,
}));

const amistad = (overrides = {}) => ({
  id: 'f-1',
  otherUserId: 'u-9',
  otherUserName: 'Ana García',
  status: 'ACCEPTED',
  createdAt: '2026-08-01T10:00:00Z',
  ...overrides,
});

const pintar = (props = {}) =>
  render(
    <MemoryRouter>
      <FriendCard friendship={amistad()} mode="friend" t={(k) => k} {...props} />
    </MemoryRouter>
  );

/**
 * Hasta ahora `/players/{id}` solo se alcanzaba desde una tarjeta del feed, asi
 * que un amigo que no hubiera publicado nada era inalcanzable.
 */
describe('FriendCard', () => {
  it('links the name to the player profile', () => {
    pintar();

    expect(screen.getByTestId('friend-profile-link')).toHaveAttribute('href', '/players/u-9');
  });

  it.each(['friend', 'received', 'sent'])('links in mode %s too', (mode) => {
    // En una solicitud recibida es donde mas falta hace: ver quien te la manda
    // antes de aceptarla
    pintar({ mode, friendship: amistad({ status: 'PENDING' }) });

    expect(screen.getByTestId('friend-profile-link')).toHaveAttribute('href', '/players/u-9');
  });

  it('keeps the photo out of the tab order', () => {
    // La foto enlaza al mismo sitio para dar mas zona tactil, pero dos paradas
    // seguidas con el mismo nombre solo estorban a quien navega por teclado
    pintar();

    const enlaces = screen.getAllByRole('link', { hidden: true });
    const foto = enlaces.find((a) => a.getAttribute('tabindex') === '-1');

    expect(foto).toHaveAttribute('href', '/players/u-9');
  });

  it('announces one link per card, not two with the same name', () => {
    // `tabindex="-1"` quita la parada de teclado pero NO saca del arbol de
    // accesibilidad: sin `aria-hidden`, el lector anuncia la foto y el nombre
    // como dos enlaces identicos al mismo sitio
    pintar();

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/players/u-9');
  });

  it('tells the profile it was reached from friends, so it can send you back', () => {
    // Sin la pista, volver desde el perfil deja en el feed y hay que rehacer el
    // camino hasta Amigos en cada solicitud que se revisa. El state no aparece
    // en el DOM, asi que se navega de verdad y se lee en el destino
    const Destino = () => <p>viene de: {useLocation().state?.from ?? 'ningun sitio'}</p>;

    render(
      <MemoryRouter initialEntries={['/friends']}>
        <Routes>
          <Route
            path="/friends"
            element={<FriendCard friendship={amistad()} mode="friend" t={(k) => k} />}
          />
          <Route path="/players/:userId" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('friend-profile-link'));

    expect(screen.getByText('viene de: friends')).toBeInTheDocument();
  });

  it('still links when the name is unknown', () => {
    // Sin nombre la etiqueta cae en una traduccion, pero el id sigue estando
    pintar({ friendship: amistad({ otherUserName: null }) });

    expect(screen.getByTestId('friend-profile-link')).toHaveAttribute('href', '/players/u-9');
  });
});
