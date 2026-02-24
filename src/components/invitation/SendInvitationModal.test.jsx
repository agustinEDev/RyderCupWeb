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
});
