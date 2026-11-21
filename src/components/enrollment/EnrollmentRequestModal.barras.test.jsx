import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EnrollmentRequestModal from './EnrollmentRequestModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div
      {...Object.fromEntries(
        Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)),
      )}
    >
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

const abre = (props = {}) => {
  const onConfirm = vi.fn();
  render(
    <MemoryRouter>
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        {...props}
      />
    </MemoryRouter>,
  );
  return onConfirm;
};
const selector = () =>
  screen.getByLabelText('competitions:enrollment.colorLabel');
const confirmar = () =>
  fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

/**
 * F1 · la barra general al apuntarse (barras por campo): obligatoria, de
 * todos los colores menos OTHER, con la habitual de su género marcada.
 */
describe('EnrollmentRequestModal · la barra general', () => {
  it('ofrece todos los colores menos OTHER, en el orden de los selectores, con «Elige una barra» delante', () => {
    abre({ generoDelJugador: 'MALE' });
    expect(
      within(selector())
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual([
      '',
      'BLACK',
      'WHITE',
      'YELLOW',
      'BLUE',
      'RED',
      'GOLD',
      'GREEN',
      'ORANGE',
      'PINK',
    ]);
  });

  it('selector ancho: el texto vacío largo, «Elige una barra»', () => {
    abre({ generoDelJugador: 'MALE' });
    expect(within(selector()).getAllByRole('option')[0]).toHaveTextContent(
      /^competitions:tees\.choose$/,
    );
  });

  it.each([
    ['MALE', 'YELLOW'],
    ['FEMALE', 'RED'],
  ])('%s: sale marcada su habitual, %s, y se manda', (genero, color) => {
    const onConfirm = abre({ generoDelJugador: genero });
    expect(selector().value).toBe(color);
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith(color, null, null);
  });

  it('elige otra y se manda la elegida', () => {
    const onConfirm = abre({ generoDelJugador: 'FEMALE' });
    fireEvent.change(selector(), { target: { value: 'BLUE' } });
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('BLUE', null, null);
  });

  it('sin género: ninguna marcada, y no se envía hasta elegirla', () => {
    const onConfirm = abre();
    expect(selector().value).toBe('');
    expect(screen.getByText('competitions:enrollment.confirm')).toBeDisabled();
    fireEvent.change(selector(), { target: { value: 'WHITE' } });
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('WHITE', null, null);
  });

  it('al elegir el género en el modal sale su habitual, y cambiarlo no deja la anterior', () => {
    const onConfirm = abre({ pideGenero: true });
    const genero = screen.getByTestId('selector-de-genero');
    fireEvent.change(genero, { target: { value: 'FEMALE' } });
    expect(selector().value).toBe('RED');
    fireEvent.change(selector(), { target: { value: 'BLUE' } });
    fireEvent.change(genero, { target: { value: 'MALE' } });
    expect(selector().value).toBe('YELLOW');
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('YELLOW', 'MALE', null);
  });
});
