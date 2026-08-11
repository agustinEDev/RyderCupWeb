import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AddFriendModal from './AddFriendModal';

const navigate = vi.fn();

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('../ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

const RESULTADOS = [
  { id: 'u-1', firstName: 'Ana', lastName: 'García' },
  { id: 'u-2', firstName: 'Luis', lastName: 'Pérez' },
];

const pintar = (props = {}) => {
  const onClose = vi.fn();
  const onSearchUsers = vi.fn().mockResolvedValue(RESULTADOS);
  render(
    <MemoryRouter>
      <AddFriendModal
        isOpen
        onClose={onClose}
        onSearchUsers={onSearchUsers}
        t={(k) => k}
        {...props}
      />
    </MemoryRouter>
  );
  return { onClose, onSearchUsers };
};

const buscar = async (texto = 'ana') => {
  fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: texto } });
  await waitFor(() => expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument(), {
    timeout: 2000,
  });
};

/**
 * El modal ya no envia nada: elegir a alguien lleva a su perfil, que es donde
 * vive el boton de enviar la solicitud.
 */
describe('AddFriendModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the profile of the player you pick', async () => {
    const { onClose } = pintar();
    await buscar();

    fireEvent.click(screen.getByTestId('search-result-u-2'));

    expect(navigate).toHaveBeenCalledWith('/players/u-2');
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the profile from the keyboard too', async () => {
    // La navegacion con flechas y Enter ya existia para seleccionar; llevaba a
    // un estado que ya no hay, asi que tenia que ir al mismo sitio que el raton
    pintar();
    await buscar();

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(navigate).toHaveBeenCalledWith('/players/u-1');
  });

  it('no longer offers a way to send from here', async () => {
    pintar();
    await buscar();

    expect(screen.queryByTestId('send-request-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
  });

  it('says where picking someone takes you', async () => {
    // Sin el boton de enviar, nada mas explica que la fila navega
    pintar();

    expect(screen.getByText('add.opensProfileHint')).toBeInTheDocument();
  });

  it('does not search until there are two characters', async () => {
    const { onSearchUsers } = pintar();

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'a' } });

    await waitFor(() => expect(screen.getByText('add.searchMinChars')).toBeInTheDocument());
    expect(onSearchUsers).not.toHaveBeenCalled();
  });
});
