import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * La hoja «Otro…» del selector de golpes (#855, QA final del 12 oct 2026).
 *
 * | Caso                                  | Resultado                          |
 * |---------------------------------------|------------------------------------|
 * | 12 y ✓ / 12 e Intro                   | Elige 12                           |
 * | 16, 0 o «abc»                         | «Entre 1 y 15» y ✓ desactivado     |
 * | Vacío                                 | Sin aviso, ✓ desactivado           |
 * | La fila del número a 360 px           | El campo encoge: los botones caben |
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));

const ScoreInputPanel = (await import('./ScoreInputPanel')).default;

const abrirOtro = (onSelect = vi.fn()) => {
  render(<ScoreInputPanel value={undefined} onSelect={onSelect} onClose={vi.fn()} label="Hoyo 1" par={4} />);
  fireEvent.click(screen.getByRole('button', { name: 'input.customScore' }));
  return { onSelect, campo: screen.getByRole('textbox') };
};

describe('ScoreInputPanel «Otro…» (#855)', () => {
  it('12 y ✓ elige 12', () => {
    const { onSelect, campo } = abrirOtro();
    fireEvent.change(campo, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'input.confirmScore' }));

    expect(onSelect).toHaveBeenCalledWith(12);
  });

  it('Intro confirma', () => {
    const { onSelect, campo } = abrirOtro();
    fireEvent.change(campo, { target: { value: '12' } });
    fireEvent.submit(campo.closest('form'));

    expect(onSelect).toHaveBeenCalledWith(12);
  });

  it('revisor: «07» vale 7', () => {
    const { onSelect, campo } = abrirOtro();
    fireEvent.change(campo, { target: { value: '07' } });
    fireEvent.click(screen.getByRole('button', { name: 'input.confirmScore' }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it.each(['16', '0', 'abc', '+5', '4.5', '00'])('con «%s» dice el rango y no deja confirmar', (valor) => {
    const { onSelect, campo } = abrirOtro();
    fireEvent.change(campo, { target: { value: valor } });

    // Sin `role="alert"`: no interrumpe al lector de pantalla a cada tecla (/code-review)
    expect(screen.getByTestId('fuera-de-rango')).toHaveTextContent('input.customScoreRange');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(campo).toHaveAttribute('aria-describedby', 'fuera-de-rango');
    expect(screen.getByRole('button', { name: 'input.confirmScore' })).toBeDisabled();
    fireEvent.submit(campo.closest('form'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('vacío, sin aviso y sin confirmar', () => {
    abrirOtro();

    expect(screen.queryByTestId('fuera-de-rango')).toBeNull();
    expect(screen.getByRole('button', { name: 'input.confirmScore' })).toBeDisabled();
  });

  it('el campo puede encoger (min-w-0) y los botones no (shrink-0): a 360 px no se sale', () => {
    const { campo } = abrirOtro();

    expect(campo.className).toContain('min-w-0');
    expect(screen.getByRole('button', { name: 'input.back' }).className).toContain('shrink-0');
    expect(screen.getByRole('button', { name: 'input.confirmScore' }).className).toContain('shrink-0');
  });
});


describe('ScoreInputPanel · la raya, solo donde se permite (23 oct 2026)', () => {
  it('sin decir nada no ofrece la raya', () => {
    render(<ScoreInputPanel value={undefined} onSelect={vi.fn()} onClose={vi.fn()} label="Hoyo 1" par={4} />);

    expect(screen.queryByTestId('picked-up-button')).toBeNull();
  });

  it('donde se permite, sí', () => {
    render(
      <ScoreInputPanel value={undefined} onSelect={vi.fn()} onClose={vi.fn()} label="Hoyo 1" par={4} allowPickedUp />
    );

    expect(screen.getByTestId('picked-up-button')).toBeInTheDocument();
  });
});
