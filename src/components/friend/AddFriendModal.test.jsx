import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    expect(navigate).toHaveBeenCalledWith('/players/u-2', { state: { from: 'friends' } });
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the profile from the keyboard too', async () => {
    // La navegacion con flechas y Enter ya existia para seleccionar; llevaba a
    // un estado que ya no hay, asi que tenia que ir al mismo sitio que el raton
    pintar();
    await buscar();

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(navigate).toHaveBeenCalledWith('/players/u-1', { state: { from: 'friends' } });
  });

  it('opens the highlighted result even if Enter arrives before React re-renders', async () => {
    // Las dos teclas en el MISMO acto: React no llega a pintar entre una y
    // otra, que es justo lo que pasa cuando alguien teclea rapido. Con el
    // indice copiado a la ref por un efecto posterior al render, el `Enter`
    // leia todavia -1 y no abria nada. Separadas en dos `fireEvent`, cada
    // una hace su propio commit y el fallo depende de lo rapida que sea la
    // maquina: por eso el test de arriba se caia en CI y aqui no.
    pintar();
    await buscar();

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(navigate).toHaveBeenCalledWith('/players/u-1', { state: { from: 'friends' } });
  });

  it('closes the modal on the second Escape, without needing a third', async () => {
    // El primer Escape cierra el desplegable; el segundo debe cerrar el modal.
    // Con `showDropdownRef` copiada despues del render, el segundo Escape lo
    // veia todavia abierto y volvia a cerrarlo: hacian falta tres.
    const { onClose } = pintar();
    await buscar();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes only the dropdown on the first Escape, leaving the modal open', async () => {
    // La otra mitad del contrato: sin esto, alguien podria simplificar el
    // manejador a un `onClose()` incondicional y el test de arriba seguiria
    // en verde mientras el primer Escape se lleva el modal por delante.
    const { onClose } = pintar();
    await buscar();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
  });

  it('no longer offers a way to send from here', async () => {
    pintar();
    await buscar();

    expect(screen.queryByTestId('send-request-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
  });

  it('can be dismissed by the backdrop, not only by a 20px icon', async () => {
    // Al quitar el pie con Cancelar, la X de la cabecera quedo como unica
    // salida. En un telefono no hay tecla de escape a la que recurrir
    const { onClose } = pintar();

    fireEvent.click(screen.getByTestId('add-friend-backdrop'));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when the click lands inside the dialog', async () => {
    // El cierre por fondo no puede tragarse los clics del propio contenido
    const { onClose } = pintar();

    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
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
