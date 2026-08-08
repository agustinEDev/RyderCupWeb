import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallInstructionsModal from './InstallInstructionsModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

const open = (route, onClose = vi.fn()) =>
  render(<InstallInstructionsModal isOpen route={route} onClose={onClose} />);

/**
 * Guia de instalacion paso a paso (FE #335).
 *
 * En iOS no hay API de instalacion, asi que estos pasos son la funcionalidad:
 * quien no los siga no instala la aplicacion.
 */
describe('InstallInstructionsModal', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<InstallInstructionsModal isOpen={false} route="safari-iphone" onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('walks an iPhone through the menu, where Share actually lives', () => {
    // Verificado con capturas de un iPhone real: Compartir vive dentro del
    // menu ···, y "Anadir a pantalla de inicio" esta detras de "Ver mas"
    open('safari-iphone');

    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual([
      '1installModal.steps.moreButton',
      '2installModal.steps.shareInMenu',
      '3installModal.steps.findAddToHome',
      '4installModal.steps.confirmAdd',
    ]);
  });

  it('sends an iPad to the top bar instead', () => {
    open('safari-ipad');

    expect(screen.getByText('installModal.steps.shareTop')).toBeInTheDocument();
    expect(screen.queryByText('installModal.steps.moreButton')).not.toBeInTheDocument();
  });

  it('gives a non-Safari browser its own two steps', () => {
    open('other-browser');

    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual(['1installModal.steps.openMenu', '2installModal.steps.chooseAdd']);
  });

  it('covers desktop Safari through the File menu', () => {
    open('desktop-safari');

    expect(screen.getByText('installModal.steps.openFileMenu')).toBeInTheDocument();
    expect(screen.getByText('installModal.steps.chooseDock')).toBeInTheDocument();
  });

  it('draws the phone only where a position can be pointed at', () => {
    // Dibujar la barra de Safari a quien usa otro navegador manda a buscar
    // donde no esta
    const { container: iphone } = open('safari-iphone');
    expect(iphone.querySelector('svg[role="img"]')).not.toBeNull();

    const { container: other } = open('other-browser');
    expect(other.querySelector('svg[role="img"]')).toBeNull();
  });

  it('falls back to the browser-menu steps for an unknown route', () => {
    open('something-new');

    expect(screen.getByText('installModal.steps.openMenu')).toBeInTheDocument();
  });

  it('announces itself as a dialog', () => {
    open('safari-iphone');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'install-modal-title');
  });

  it('closes on the button, on the backdrop and on Escape', () => {
    const onClose = vi.fn();

    const { unmount: closeButton } = open('safari-iphone', onClose);
    fireEvent.click(screen.getByText('installModal.gotIt'));
    expect(onClose).toHaveBeenCalledTimes(1);
    closeButton();

    const { unmount: backdrop } = open('safari-iphone', onClose);
    fireEvent.click(screen.getByTestId('install-instructions-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
    backdrop();

    open('safari-iphone', onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when the dialog itself is clicked', () => {
    const onClose = vi.fn();
    open('safari-iphone', onClose);

    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog on open', () => {
    open('safari-iphone');

    expect(document.activeElement).toBe(screen.getByLabelText('installModal.close'));
  });

  it('returns focus to whatever opened it', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = open('safari-iphone');
    expect(document.activeElement).not.toBe(trigger);

    unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps Tab inside the dialog', () => {
    open('safari-iphone');
    const focusables = screen.getByRole('dialog').querySelectorAll('button');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('locks background scroll while open and restores it after', () => {
    document.body.style.overflow = 'scroll';

    const { unmount } = open('safari-iphone');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });
  it('stays reachable on a short viewport', () => {
    // Encontrado por CodeRabbit: con el fondo bloqueado y sin scroll propio, un
    // movil en horizontal se queda sin ver los ultimos pasos ni el boton
    open('safari-iphone');

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('overflow-y-auto');
    expect(dialog.className).toContain('max-h-[calc(100dvh-2rem)]');
  });
});
