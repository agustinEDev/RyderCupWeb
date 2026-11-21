import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AceptarInvitacionModal from './AceptarInvitacionModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));

const abre = (props = {}) => {
  const onConfirm = vi.fn();
  render(
    <AceptarInvitacionModal
      isOpen
      pideGenero={false}
      generoDelJugador="FEMALE"
      onClose={vi.fn()}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return onConfirm;
};
const barra = () => screen.getByLabelText('competitions:enrollment.colorLabel');
const aceptar = () => fireEvent.click(screen.getByTestId('aceptar-con-barra'));

/** F1 · aceptar una invitación con la barra general obligatoria. */
describe('AceptarInvitacionModal', () => {
  it('con género: su habitual marcada y se acepta con ella', () => {
    const onConfirm = abre();
    expect(barra().value).toBe('RED');
    aceptar();
    expect(onConfirm).toHaveBeenCalledWith('RED', null);
  });

  it('elige otra y se acepta con la elegida', () => {
    const onConfirm = abre();
    fireEvent.change(barra(), { target: { value: 'BLUE' } });
    aceptar();
    expect(onConfirm).toHaveBeenCalledWith('BLUE', null);
  });

  it('sin género en el perfil: se pregunta y, al elegirlo, sale su habitual', () => {
    const onConfirm = abre({ pideGenero: true, generoDelJugador: null });
    expect(screen.getByTestId('aceptar-con-barra')).toBeDisabled();
    fireEvent.change(screen.getByTestId('selector-de-genero'), {
      target: { value: 'MALE' },
    });
    expect(barra().value).toBe('YELLOW');
    aceptar();
    expect(onConfirm).toHaveBeenCalledWith('YELLOW', 'MALE');
  });

  it('con la pregunta del género, elegir solo la barra no basta', () => {
    abre({ pideGenero: true, generoDelJugador: null });
    fireEvent.change(barra(), { target: { value: 'WHITE' } });
    expect(screen.getByTestId('aceptar-con-barra')).toBeDisabled();
  });

  it('sin género conocido ni pregunta: hay que elegir la barra', () => {
    const onConfirm = abre({ generoDelJugador: null });
    expect(screen.getByTestId('aceptar-con-barra')).toBeDisabled();
    fireEvent.change(barra(), { target: { value: 'WHITE' } });
    aceptar();
    expect(onConfirm).toHaveBeenCalledWith('WHITE', null);
  });

  it('cerrada no se pinta', () => {
    const { container } = render(
      <AceptarInvitacionModal
        isOpen={false}
        pideGenero={false}
        generoDelJugador={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
