/**
 * LA TABLA — el hándicap a mano con su «+» (QA del 26 oct, FE #938-6).
 *
 * Un plus se guarda negativo (-1.5) y en golf se dice «+1.5». Antes había que
 * escribir «-1.5», y en el teclado decimal del móvil no hay signo. Ahora el
 * número va sin signo y el «+» de al lado dice si es plus. Hacia fuera, el
 * valor de siempre: el texto con el signo que guarda el backend.
 *
 *   #    caso                                              | esperado
 *   -----|-------------------------------------------------|----------------------------------
 *   C1   llega -1.5 (texto o número)                       | se ve «1.5» y el «+» pulsado
 *   C2   llega 12.3                                        | «12.3», el «+» sin pulsar
 *   C3   sin plus, se escribe 2                            | sale «2»
 *   C4   se pulsa «+» con 2                                | sale «-2»
 *   C5   se quita el «+» con -2                            | sale «2»
 *   C6   «+» con el campo vacío, luego se escribe 3        | sale «-3»
 *   C7   se escribe «-1.5» como antes                      | sale «-1.5», el «+» pulsado
 *   C7b  lo mismo con el «+» ya pulsado                    | «-1.5», no «--1.5»
 *   C8   se vacía el campo con plus                        | sale «» y el «+» se suelta (pasada del Kind)
 *   C8b  en el de texto, solo el signo («+» o «-»)          | el «+» se enciende, esperando el número
 *   C8c  en el numérico, «1,» a medio escribir (llega «»)    | el «+» sigue pulsado (revisor)
 *   C9   cambia desde fuera de -2 a 5                      | el «+» se suelta
 *   C10  límites del número sin signo                      | de 0 a 54; con plus, hasta 10
 *   C11  desactivado                                       | el campo y el «+»
 *   C12  el «+» se anuncia en los dos idiomas              | «Hándicap plus» / «Plus handicap»
 *   C13  lo demás va al campo (id, placeholder...)         | sí
 *   C14  sin hándicap (null)                               | vacío y sin «+»
 *   C15  quien lo usa lo vacía (cancelar, tras guardar)    | el «+» se suelta
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CampoDeHandicap from './CampoDeHandicap';
import es from '../../i18n/locales/es/common.json';
import en from '../../i18n/locales/en/common.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

const pintar = (value, props = {}) => {
  const onChange = vi.fn();
  const resultado = render(<CampoDeHandicap id="hcp" value={value} onChange={onChange} {...props} />);
  return { onChange, ...resultado };
};

// Con el estado de verdad detrás, como lo usa una pantalla
const Controlado = ({ inicial = '', alCambiar }) => {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoDeHandicap
      id="hcp"
      value={valor}
      onChange={(v) => {
        setValor(v);
        alCambiar?.(v);
      }}
    />
  );
};

const campo = () => screen.getByRole('spinbutton');
const mas = () => screen.getByRole('button', { name: 'handicapField.plus' });

describe('CampoDeHandicap', () => {
  it.each([['-1.5'], [-1.5]])('C1: con %p se ve sin signo y el «+» pulsado', (valor) => {
    pintar(valor);

    expect(campo()).toHaveValue(1.5);
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
  });

  it('C2: un hándicap normal, sin el «+»', () => {
    pintar(12.3);

    expect(campo()).toHaveValue(12.3);
    expect(mas()).toHaveAttribute('aria-pressed', 'false');
  });

  it('C3: sin plus, sale lo escrito', () => {
    const { onChange } = pintar('');

    fireEvent.change(campo(), { target: { value: '2' } });

    expect(onChange).toHaveBeenLastCalledWith('2');
  });

  it('C4: pulsar «+» lo hace plus', () => {
    const { onChange } = pintar('2');

    fireEvent.click(mas());

    expect(onChange).toHaveBeenLastCalledWith('-2');
  });

  it('C5: quitar el «+» lo deja normal', () => {
    const { onChange } = pintar('-2');

    fireEvent.click(mas());

    expect(onChange).toHaveBeenLastCalledWith('2');
  });

  it('C6: el «+» pulsado con el campo vacío vale para lo que se escriba luego', () => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);

    fireEvent.click(mas());
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(campo(), { target: { value: '3' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-3');
    expect(campo()).toHaveValue(3);
  });

  it('C7: escrito con el menos de antes, también es plus', () => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '-1.5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
    expect(campo()).toHaveValue(1.5);
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
  });

  // /code-review: en golf el plus se escribe «+1,5»; en el campo de texto de la
  // ficha llegaba tal cual y se guardaba como hándicap normal
  it('C7c: escrito con el «+», también es plus', () => {
    const alCambiar = vi.fn();
    render(<CampoDeHandicap id="hcp" type="text" value="" onChange={alCambiar} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '+1,5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1,5');
  });

  it('C7b: con el «+» ya pulsado, el menos escrito no se suma al suyo', () => {
    const alCambiar = vi.fn();
    render(<Controlado inicial="-2" alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '-1.5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
  });

  // Pasada del Kind (26 oct): con el «+» encendido tras vaciar, escribir 5
  // guardaba +5 sin quererlo. Los plus son pocos: quien lo sea lo vuelve a pulsar
  it('C8: vaciado, sale vacío y el «+» se suelta; lo siguiente ya no es plus', () => {
    const alCambiar = vi.fn();
    render(<Controlado inicial="-2" alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '' } });
    expect(alCambiar).toHaveBeenLastCalledWith('');
    expect(mas()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.change(campo(), { target: { value: '5' } });
    expect(alCambiar).toHaveBeenLastCalledWith('5');
  });

  // Revisor: en el numérico, «1,» a medio escribir llega vacío (badInput); no es
  // vaciarlo, y soltar el «+» ahí guardaba 1,5 en vez de +1,5
  it('C8c: a medio escribir un decimal, el «+» sigue pulsado', () => {
    const alCambiar = vi.fn();
    render(<Controlado inicial="-1" alCambiar={alCambiar} />);
    Object.defineProperty(campo(), 'validity', { value: { badInput: true }, configurable: true });

    fireEvent.change(campo(), { target: { value: '' } });
    expect(mas()).toHaveAttribute('aria-pressed', 'true');

    delete campo().validity;
    fireEvent.change(campo(), { target: { value: '1.5' } });
    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
  });

  it.each(['+', '-'])('C8b: en el de texto, escribir solo «%s» enciende el «+» a la espera del número', (signo) => {
    const alCambiar = vi.fn();
    const Texto = () => {
      const [valor, setValor] = useState('');
      return (
        <CampoDeHandicap id="hcp" type="text" value={valor} onChange={(v) => { setValor(v); alCambiar(v); }} />
      );
    };
    render(<Texto />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: signo } });
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1,5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1,5');
  });

  it('C9: si el valor cambia desde fuera, el «+» lo sigue', () => {
    const { rerender, onChange } = pintar('-2');

    rerender(<CampoDeHandicap id="hcp" value="5" onChange={onChange} />);

    expect(mas()).toHaveAttribute('aria-pressed', 'false');
    expect(campo()).toHaveValue(5);
  });

  it('C10: el número va sin signo, hasta 54; con plus, hasta 10', () => {
    render(<Controlado />);

    expect(campo()).toHaveAttribute('min', '0');
    expect(campo()).toHaveAttribute('max', '54');
    fireEvent.click(mas());
    expect(campo()).toHaveAttribute('max', '10');
  });

  it('C11: desactivado, también el «+»', () => {
    pintar('2', { disabled: true });

    expect(campo()).toBeDisabled();
    expect(mas()).toBeDisabled();
  });

  it('C12: el «+» se anuncia en los dos idiomas', () => {
    expect(es.handicapField.plus).toBe('Hándicap plus');
    expect(en.handicapField.plus).toBe('Plus handicap');
  });

  it.each([[null], [undefined]])('C14: sin hándicap (%p), el campo vacío y sin «+»', (valor) => {
    const { onChange } = pintar(valor);

    expect(campo()).toHaveValue(null);
    expect(mas()).toHaveAttribute('aria-pressed', 'false');
    // Y el «+» se queda esperando al número, sin inventarse uno
    fireEvent.click(mas());
    expect(onChange).not.toHaveBeenCalled();
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
  });

  it('C13: lo demás va al campo', () => {
    pintar('', { placeholder: 'tu hándicap', name: 'handicap', required: true });

    expect(campo()).toHaveAttribute('id', 'hcp');
    expect(campo()).toHaveAttribute('placeholder', 'tu hándicap');
    expect(campo()).toHaveAttribute('name', 'handicap');
    expect(campo()).toBeRequired();
  });

  // Revisor: el «+» recordado con el campo vacío no sobrevive a que quien lo
  // usa lo vacíe por su cuenta; si no, lo siguiente saldría plus sin pedirlo
  it('C15: si quien lo usa lo vacía, el «+» se suelta', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CampoDeHandicap id="hcp" value="" onChange={onChange} />);
    fireEvent.click(mas());
    rerender(<CampoDeHandicap id="hcp" value="-2" onChange={onChange} />);

    rerender(<CampoDeHandicap id="hcp" value="" onChange={onChange} />);

    expect(mas()).toHaveAttribute('aria-pressed', 'false');
  });
});
