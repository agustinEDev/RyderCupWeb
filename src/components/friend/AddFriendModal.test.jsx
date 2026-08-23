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

  it('does not pass off a failed search as an empty one', async () => {
    // Con la busqueda rota, dejar el desplegable abierto y vacio enseñaba
    // «no se ha encontrado a nadie», que es mentira: no es que no haya nadie,
    // es que no se ha podido preguntar.
    // Hace falta una busqueda buena antes: si la que falla es la primera, el
    // desplegable no llego a abrirse nunca y no se distingue un caso del otro.
    const onSearchUsers = vi.fn()
      .mockResolvedValueOnce(RESULTADOS)
      .mockRejectedValueOnce(new Error('API caida'));
    pintar({ onSearchUsers });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'ana' } });
    await waitFor(() => expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument(), {
      timeout: 2000,
    });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'anas' } });
    await waitFor(() => expect(onSearchUsers).toHaveBeenCalledTimes(2), { timeout: 2000 });

    await waitFor(() => {
      expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('no-users-found')).not.toBeInTheDocument();
    // Y lo dice: sin mensaje, la pantalla se queda igual que si no hubieras
    // buscado, y lo natural es reescribir y volver a fallar en silencio.
    expect(screen.getByTestId('search-error')).toBeInTheDocument();
  });

  it('clears the failure notice when a new search starts', async () => {
    // Si se queda pegado, el usuario ve un error viejo sobre resultados buenos.
    const onSearchUsers = vi.fn()
      .mockRejectedValueOnce(new Error('API caida'))
      .mockResolvedValueOnce(RESULTADOS);
    pintar({ onSearchUsers });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'ana' } });
    await waitFor(() => expect(screen.getByTestId('search-error')).toBeInTheDocument(), {
      timeout: 2000,
    });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'anas' } });

    await waitFor(() => {
      expect(screen.queryByTestId('search-error')).not.toBeInTheDocument();
    });
    expect(await screen.findByTestId('search-results-dropdown')).toBeInTheDocument();
  });

  it('drops the failure notice when the field is emptied', async () => {
    // Si no, el aviso rojo se queda debajo de un buscador vacio, denunciando
    // un fallo de una busqueda que ya no existe.
    const onSearchUsers = vi.fn().mockRejectedValue(new Error('API caida'));
    pintar({ onSearchUsers });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'ana' } });
    await waitFor(() => expect(screen.getByTestId('search-error')).toBeInTheDocument(), {
      timeout: 2000,
    });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByTestId('search-error')).not.toBeInTheDocument();
    });
  });

  it('does not let a late failure land on an already-emptied field', async () => {
    // La rama de menos de dos caracteres no invalidaba la peticion en vuelo,
    // asi que el rechazo llegaba despues y plantaba el aviso rojo debajo de un
    // buscador vacio.
    let rechazar;
    const onSearchUsers = vi.fn(() => new Promise((_, reject) => { rechazar = reject; }));
    pintar({ onSearchUsers });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'ana' } });
    await waitFor(() => expect(onSearchUsers).toHaveBeenCalled(), { timeout: 2000 });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: '' } });

    // El rechazo se deja correr del todo ANTES de comprobar: una asercion
    // negativa dentro de `waitFor` se cumple en la primera pasada —antes de que
    // el `catch` haya llegado a ejecutarse— y bendecia el fallo que vigila.
    await act(async () => {
      rechazar(new Error('API caida'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByTestId('search-error')).not.toBeInTheDocument();
  });

  it('stops pointing at an option that is no longer there when the field is emptied', async () => {
    // `putResults([])` desmonta las opciones, pero sin limpiar el resaltado el
    // `aria-activedescendant` seguia nombrando una que ya no existe, y un lector
    // de pantalla anuncia algo que no esta.
    pintar();
    await buscar();

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    const input = screen.getByTestId('user-search-input');
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBeFalsy();
    });
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
