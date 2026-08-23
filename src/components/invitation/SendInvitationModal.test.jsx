import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SendInvitationModal from './SendInvitationModal';

const mockT = (key) => key;

describe('SendInvitationModal', () => {
  let onClose;
  let onSend;
  let onSendByUserId;
  let onSearchUsers;

  beforeEach(() => {
    vi.useFakeTimers();
    onClose = vi.fn();
    onSend = vi.fn();
    onSendByUserId = vi.fn();
    onSearchUsers = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderModal = (props = {}) => {
    return render(
      <SendInvitationModal
        isOpen={true}
        onClose={onClose}
        onSend={onSend}
        onSendByUserId={onSendByUserId}
        onSearchUsers={onSearchUsers}
        isProcessing={false}
        t={mockT}
        {...props}
      />
    );
  };

  it('should not render when isOpen is false', () => {
    render(
      <SendInvitationModal
        isOpen={false}
        onClose={onClose}
        onSend={onSend}
        onSendByUserId={onSendByUserId}
        onSearchUsers={onSearchUsers}
        isProcessing={false}
        t={mockT}
      />
    );
    expect(screen.queryByTestId('invitation-tabs')).not.toBeInTheDocument();
  });

  it('should render tabs when isOpen is true', () => {
    renderModal();
    expect(screen.getByTestId('tab-search-user')).toBeInTheDocument();
    expect(screen.getByTestId('tab-by-email')).toBeInTheDocument();
  });

  it('should default to search user tab', () => {
    renderModal();
    expect(screen.getByTestId('user-search-input')).toBeInTheDocument();
    expect(screen.queryByTestId('invitation-email-input')).not.toBeInTheDocument();
  });

  it('should switch to email tab', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('tab-by-email'));
    expect(screen.getByTestId('invitation-email-input')).toBeInTheDocument();
    expect(screen.queryByTestId('user-search-input')).not.toBeInTheDocument();
  });

  it('should switch back to search tab', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));
    expect(screen.getByTestId('user-search-input')).toBeInTheDocument();
  });

  // --- Email tab tests ---

  it('should have required email field on email tab', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('tab-by-email'));
    expect(screen.getByTestId('invitation-email-input')).toHaveAttribute('required');
  });

  it('should call onSend with email and message from email tab', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('tab-by-email'));

    fireEvent.change(screen.getByTestId('invitation-email-input'), { target: { value: 'player@example.com' } });
    fireEvent.change(screen.getByTestId('invitation-message-input'), { target: { value: 'Welcome!' } });

    const form = screen.getByTestId('invitation-email-input').closest('form');
    fireEvent.submit(form);

    expect(onSend).toHaveBeenCalledWith('player@example.com', 'Welcome!');
  });

  it('should call onSend with null message when empty from email tab', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('tab-by-email'));

    fireEvent.change(screen.getByTestId('invitation-email-input'), { target: { value: 'player@example.com' } });

    const form = screen.getByTestId('invitation-email-input').closest('form');
    fireEvent.submit(form);

    expect(onSend).toHaveBeenCalledWith('player@example.com', null);
  });

  // --- Search tab tests ---

  it('should show min chars hint when typing less than 2 chars', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'a' } });
    expect(screen.getByText('send.searchMinChars')).toBeInTheDocument();
  });

  it('should call onSearchUsers after debounce', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'John' } });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(onSearchUsers).toHaveBeenCalledWith('John');
  });

  it('should show search results in dropdown', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
      { id: 'u2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', countryCode: 'US' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    // Advance debounce timer and flush promise microtasks
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('search-result-u1')).toBeInTheDocument();
    expect(screen.getByTestId('search-result-u2')).toBeInTheDocument();
  });

  it('should show no users found when search returns empty', async () => {
    onSearchUsers.mockResolvedValue([]);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'xyz' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('no-users-found')).toBeInTheDocument();
  });

  it('should select user and show chip', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'John' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-result-u1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-result-u1'));

    expect(screen.getByTestId('selected-user-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('user-search-input')).not.toBeInTheDocument();
  });

  it('should clear selected user when X is clicked', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'John' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-result-u1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-result-u1'));
    expect(screen.getByTestId('selected-user-chip')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('clear-selected-user'));
    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-search-input')).toBeInTheDocument();
  });

  it('should call onSendByUserId when submitting with selected user', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'John' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-result-u1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-result-u1'));

    fireEvent.change(screen.getByTestId('invitation-message-input'), { target: { value: 'Hello!' } });

    const form = screen.getByTestId('selected-user-chip').closest('form');
    fireEvent.submit(form);

    expect(onSendByUserId).toHaveBeenCalledWith('u1', 'Hello!');
  });

  it('should show error when submitting search tab without selecting user', () => {
    renderModal();

    // Submit the search form without selecting a user
    const submitBtn = screen.getByTestId('send-invitation-button');
    // The button should be disabled because no user is selected
    expect(submitBtn).toBeDisabled();
  });

  it('should disable inputs when processing', () => {
    renderModal({ isProcessing: true });

    // On search tab
    expect(screen.getByTestId('user-search-input')).toBeDisabled();
    expect(screen.getByTestId('invitation-message-input')).toBeDisabled();
    expect(screen.getByTestId('send-invitation-button')).toBeDisabled();
  });

  it('should show character count for message', () => {
    renderModal();
    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('invitation-message-input'), { target: { value: 'Hello' } });
    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    renderModal();
    const closeButtons = screen.getAllByRole('button');
    // First button is the X close button
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  // --- Keyboard navigation tests ---

  it('should highlight next result on ArrowDown', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
      { id: 'u2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', countryCode: 'US' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByTestId('search-result-u1').getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByTestId('search-result-u2').getAttribute('aria-selected')).toBe('true');
  });

  it('should wrap around on ArrowDown past last result', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Should wrap back to first
    expect(screen.getByTestId('search-result-u1').getAttribute('aria-selected')).toBe('true');
  });

  it('should select highlighted result on Enter', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('selected-user-chip')).toBeInTheDocument();
  });

  it('should close dropdown on Escape', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
  });

  it('should highlight result on mouse enter', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
      { id: 'u2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', countryCode: 'US' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.mouseEnter(screen.getByTestId('search-result-u2'));
    expect(screen.getByTestId('search-result-u2').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('search-result-u1').getAttribute('aria-selected')).toBe('false');
  });

  it('should stop intercepting keys after switching to the email tab', async () => {
    // El desplegable desaparece de la pantalla al cambiar de pestana, pero su
    // estado sobrevivia y el listener es de `document`: en la pestana de
    // correo se tragaba el Enter, asi que el formulario no se enviaba.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByTestId('tab-by-email'));

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    // El chip vive en el marcado de la otra pestana, asi que hay que volver
    // para ver el efecto: si el listener siguiera vivo, el Enter habria
    // seleccionado a John a espaldas del usuario.
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
  });

  it('says so when the search fails, instead of going quiet', async () => {
    onSearchUsers.mockRejectedValue(new Error('API caida'));

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('search-error')).toBeInTheDocument();
    // Y no lo hace pasar por «no hay nadie», que es otra cosa
    expect(screen.queryByTestId('no-users-found')).not.toBeInTheDocument();
  });

  it('brings the results back when returning to the search tab', async () => {
    // El campo conservaba el texto pero el desplegable no volvia: el efecto del
    // debounce solo se relanza si cambia la busqueda, asi que no habia forma de
    // recuperar los resultados sin editar lo escrito.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('user-search-input')).toHaveValue('Jo');
  });

  it('does not open the dropdown when the results land on the email tab', async () => {
    // Los resultados que llegan tarde reabrian el desplegable estando ya en la
    // otra pestana: volvia a comerse el Enter del formulario y encima dejaba a
    // un usuario seleccionado sin que nadie lo eligiera.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    fireEvent.click(screen.getByTestId('tab-by-email'));

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    fireEvent.click(screen.getByTestId('tab-search-user'));
    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
  });

  it('shows the results found while away when returning to the search tab', async () => {
    // Cambiar de pestana con la peticion en vuelo dejaba el desplegable
    // cerrado sin que el usuario lo hubiera cerrado, y al volver no habia forma
    // de ver los resultados sin editar lo escrito.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    fireEvent.click(screen.getByTestId('tab-by-email'));

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
  });

  it('does not resurrect results that no longer match what is typed', async () => {
    // Busca «Jo», cambia a «zzz» y se va a la otra pestana con la peticion en
    // vuelo: al volver, reabrir la lista de «Jo» le ofreceria a John para una
    // busqueda en la que nunca aparecio.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'zzz' } });
    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.queryByTestId('search-result-u1')).not.toBeInTheDocument();
  });

  it('restores the dropdown even when the tab was clicked with a real mousedown', async () => {
    // El `mousedown` de la propia pestana llega antes que su `click`, asi que
    // cualquier intento de recordar «lo cerro el usuario» lo marcaba como
    // cerrado y la restauracion no ocurria nunca fuera de los tests.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.mouseDown(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.mouseDown(screen.getByTestId('tab-search-user'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
  });

  it('respects a dropdown the user dismissed, even across a tab round trip', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    fireEvent.mouseDown(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.mouseDown(screen.getByTestId('tab-search-user'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
  });

  it('stops pointing at an option that is no longer there when the field is emptied', async () => {
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    act(() => { fireEvent.keyDown(document, { key: 'ArrowDown' }); });
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();

    fireEvent.change(input, { target: { value: '' } });
    expect(input.getAttribute('aria-activedescendant')).toBeFalsy();
  });

  it('restores the dropdown after clicking into the message box and back', async () => {
    // Pinchar en el mensaje cierra el desplegable pero no es descartarlo: es
    // seguir usando el formulario. Contarlo como descarte dejaba la
    // restauracion inservible en el camino mas normal.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    fireEvent.mouseDown(screen.getByTestId('invitation-message-input'));
    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
  });

  it('closes the dropdown with Escape even when focus moved to the message box', async () => {
    // Se llega tabulando, sin ningun clic que lo cierre: si la guarda de foco
    // va por delante, Escape deja de funcionar y no queda forma de cerrarlo.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    screen.getByTestId('invitation-message-input').focus();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });

    expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
  });

  it('still drives the dropdown from the keyboard while typing in the search box', async () => {
    // La otra cara de la guarda de foco, que ningun test tocaba: si se perdiera
    // el `ref` del buscador, la guarda se tragaria las flechas y el Enter y la
    // navegacion con teclado moriria en el navegador con la suite en verde.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    const input = screen.getByTestId('user-search-input');
    fireEvent.change(input, { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    input.focus();
    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(screen.getByTestId('selected-user-chip')).toHaveTextContent('John Doe');
  });

  it('leaves the keyboard alone while the user writes the personal message', async () => {
    // El listener es de `document`: con el desplegable abierto se comia las
    // flechas y el Enter de quien estaba escribiendo el mensaje, y el Enter
    // llegaba a seleccionar a alguien por su cuenta.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    screen.getByTestId('invitation-message-input').focus();

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(screen.queryByTestId('selected-user-chip')).not.toBeInTheDocument();
  });

  it('holds a failure that lands on the other tab, and raises it on return', async () => {
    // Ni saltarselo en la cara al usuario en la pestana de correo, ni perderlo:
    // sin guardarlo, al volver quedaba el campo escrito y ni lista, ni aviso de
    // «no hay nadie», ni error. Justo el silencio que este cambio quita.
    onSearchUsers.mockRejectedValue(new Error('API caida'));

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    fireEvent.click(screen.getByTestId('tab-by-email'));

    await act(async () => { vi.advanceTimersByTime(350); });

    expect(screen.queryByTestId('search-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-search-user'));
    expect(screen.getByTestId('search-error')).toBeInTheDocument();
  });

  it('forgets an old dismissal once a new search opens the dropdown', async () => {
    // Guardar el descarte por texto y no limpiarlo dejaba esa cadena envenenada
    // para siempre: quien pulso Escape una vez sobre «Jo» no recuperaba ningun
    // «Jo» futuro al volver de la otra pestana.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });

    // Se vacia y se vuelve a escribir lo mismo: es una busqueda nueva
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => { vi.advanceTimersByTime(350); });

    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('search-results-dropdown')).toBeInTheDocument();
  });

  it('does not let a late response land on an already-emptied field', async () => {
    // La rama de menos de dos caracteres no invalidaba la peticion en vuelo.
    let resolver;
    onSearchUsers.mockImplementation(() => new Promise((res) => { resolver = res; }));

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: '' } });

    await act(async () => {
      resolver([{ id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' }]);
      await Promise.resolve();
    });

    expect(screen.queryByTestId('search-results-dropdown')).not.toBeInTheDocument();
  });

  it('brings back the no-results notice too, not just the list', async () => {
    // Con cero resultados el desplegable no se reabria y el aviso depende de
    // el: se volvia a un campo con texto y ni lista ni explicacion.
    onSearchUsers.mockResolvedValue([]);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'zzz' } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByTestId('tab-by-email'));
    fireEvent.click(screen.getByTestId('tab-search-user'));

    expect(screen.getByTestId('no-users-found')).toBeInTheDocument();
  });

  it('should dismiss the no-results notice with Escape', async () => {
    // Una busqueda sin resultados deja el desplegable abierto con el aviso,
    // pero la guarda del manejador pedia lista con elementos y salia antes de
    // llegar al Escape: el aviso no habia manera de quitarlo con el teclado.
    onSearchUsers.mockResolvedValue([]);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'zzz' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId('no-users-found')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByTestId('no-users-found')).not.toBeInTheDocument();
  });

  it('should select the highlighted result even if Enter arrives before React re-renders', async () => {
    // Las dos teclas en el MISMO acto: React no llega a pintar entre una y
    // otra, que es lo que pasa cuando alguien teclea rapido. Con el indice
    // copiado a la ref despues del render, el `Enter` leia todavia -1 y no
    // seleccionaba a nadie. Mismo fallo que FE #440 en AddFriendModal.
    const mockResults = [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', countryCode: 'ES' },
      { id: 'u2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', countryCode: 'US' },
    ];
    onSearchUsers.mockResolvedValue(mockResults);

    renderModal();
    fireEvent.change(screen.getByTestId('user-search-input'), { target: { value: 'Jo' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    // El chip a secas no basta: con dos resultados sembrados, pasaria aunque
    // el Enter hubiera cogido a Jane. Lo que se prueba es que cogio al que
    // resalto el ArrowDown.
    expect(screen.getByTestId('selected-user-chip')).toHaveTextContent('John Doe');
  });
});
