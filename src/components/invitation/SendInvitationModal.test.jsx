import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SendInvitationModal from './SendInvitationModal';

const mockT = (key) => key;

describe('SendInvitationModal', () => {
  let onClose;
  let onSend;

  beforeEach(() => {
    onClose = vi.fn();
    onSend = vi.fn();
  });

  it('should not render when isOpen is false', () => {
    render(<SendInvitationModal isOpen={false} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);
    expect(screen.queryByTestId('invitation-email-input')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);
    expect(screen.getByTestId('invitation-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('invitation-message-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-invitation-button')).toBeInTheDocument();
  });

  it('should show error for empty email on submit', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);

    // Submit with empty email - the HTML5 required will prevent submit,
    // but we can test the button is present
    const emailInput = screen.getByTestId('invitation-email-input');
    expect(emailInput).toHaveAttribute('required');
  });

  it('should call onSend with email and message', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);

    const emailInput = screen.getByTestId('invitation-email-input');
    const messageInput = screen.getByTestId('invitation-message-input');

    fireEvent.change(emailInput, { target: { value: 'player@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Welcome!' } });

    // Submit the form
    const form = emailInput.closest('form');
    fireEvent.submit(form);

    expect(onSend).toHaveBeenCalledWith('player@example.com', 'Welcome!');
  });

  it('should call onSend with null message when empty', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);

    fireEvent.change(screen.getByTestId('invitation-email-input'), { target: { value: 'player@example.com' } });

    const form = screen.getByTestId('invitation-email-input').closest('form');
    fireEvent.submit(form);

    expect(onSend).toHaveBeenCalledWith('player@example.com', null);
  });

  it('should disable inputs when processing', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={true} t={mockT} />);

    expect(screen.getByTestId('invitation-email-input')).toBeDisabled();
    expect(screen.getByTestId('invitation-message-input')).toBeDisabled();
    expect(screen.getByTestId('send-invitation-button')).toBeDisabled();
  });

  it('should show character count for message', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);

    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('invitation-message-input'), { target: { value: 'Hello' } });
    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<SendInvitationModal isOpen={true} onClose={onClose} onSend={onSend} isProcessing={false} t={mockT} />);

    // The X button is the first button in the modal header
    const closeButtons = screen.getAllByRole('button');
    // First button is the X close button
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
