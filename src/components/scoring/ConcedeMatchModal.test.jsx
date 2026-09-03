import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConcedeMatchModal from './ConcedeMatchModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('ConcedeMatchModal', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<ConcedeMatchModal isOpen={false} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<ConcedeMatchModal isOpen={true} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('concede-match-modal')).toBeInTheDocument();
  });

  it('should call onConfirm with reason when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<ConcedeMatchModal isOpen={true} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('concede-reason-input'), { target: { value: 'Injury' } });
    fireEvent.click(screen.getByTestId('concede-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('Injury');
  });

  it('should call onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<ConcedeMatchModal isOpen={true} onConfirm={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('concede-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  /**
   * Aquí dentro hay un motivo escrito a mano, y en un móvil el fondo es lo que
   * se toca sin querer al ir a escribir: perderlo por eso sería peor que no
   * poder cerrar de esa forma. Para salir están «Cancelar» y Escape.
   */
  it('no se cierra al pulsar el fondo, y el motivo escrito sigue ahí', () => {
    const onClose = vi.fn();
    render(<ConcedeMatchModal isOpen={true} onConfirm={vi.fn()} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('concede-reason-input'), { target: { value: 'Lesión' } });

    fireEvent.mouseDown(screen.getByTestId('concede-match-modal'));
    fireEvent.click(screen.getByTestId('concede-match-modal'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('concede-reason-input')).toHaveValue('Lesión');
  });

  it('sí se cierra con Escape', () => {
    const onClose = vi.fn();
    render(<ConcedeMatchModal isOpen={true} onConfirm={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
