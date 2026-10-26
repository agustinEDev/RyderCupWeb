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
 *   C8c  «1,» a medio escribir, con el «+»                   | se ve «1,», sale «-1», el «+» sigue
 *   C9   cambia desde fuera de -2 a 5                      | el «+» se suelta
 *   C10  fuera de rango (más de 54; plus, más de 10)        | inválido, con «Entre +10 y 54»
 *   C16  de texto con teclado decimal                      | sin flechas, con la coma del móvil
 *   C17  «1,» y «1,5»                                      | se ven tal cual; salen «1» y «1.5»
 *   C18  lo que no es un hándicap (letras, «1,2,3», «1,55») | no se escribe
 *   C19  al salir con la coma colgando («12,»)               | se queda «12» (revisor)
 *   C20  pegado con espacios (« 12 »)                       | sale «12» (revisor)
 *   C21  fuera de rango dentro de un formulario            | el formulario no es válido
 *   C22  quien lo usa pasa `ref` o `type`                  | sigue de texto y con su validez; su `ref` llega (CodeRabbit)
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

const campo = () => screen.getByRole('textbox');
const mas = () => screen.getByRole('button', { name: 'handicapField.plus' });

describe('CampoDeHandicap', () => {
  it.each([['-1.5'], [-1.5]])('C1: con %p se ve sin signo y el «+» pulsado', (valor) => {
    pintar(valor);

    expect(campo()).toHaveValue('1.5');
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
  });

  it('C2: un hándicap normal, sin el «+»', () => {
    pintar(12.3);

    expect(campo()).toHaveValue('12.3');
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
    expect(campo()).toHaveValue('3');
  });

  it('C7: escrito con el menos de antes, también es plus', () => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '-1.5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
    expect(campo()).toHaveValue('1.5');
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
  });

  // /code-review: en golf el plus se escribe «+1,5»; en el campo de texto de la
  // ficha llegaba tal cual y se guardaba como hándicap normal
  it('C7c: escrito con el «+», también es plus', () => {
    const alCambiar = vi.fn();
    render(<CampoDeHandicap id="hcp" value="" onChange={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '+1,5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
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

  // Revisor: en el numérico «1,» llegaba vacío y soltaba el «+»; de texto, se ve
  it('C8c: a medio escribir un decimal, se ve y el «+» sigue pulsado', () => {
    const alCambiar = vi.fn();
    render(<Controlado inicial="-1" alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: '1,' } });
    expect(campo()).toHaveValue('1,');
    expect(alCambiar).toHaveBeenLastCalledWith('-1');
    expect(mas()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(campo(), { target: { value: '1,5' } });
    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
  });

  it.each(['+', '-'])('C8b: escribir solo «%s» enciende el «+» a la espera del número', (signo) => {
    const alCambiar = vi.fn();
    const Texto = () => {
      const [valor, setValor] = useState('');
      return (
        <CampoDeHandicap id="hcp" value={valor} onChange={(v) => { setValor(v); alCambiar(v); }} />
      );
    };
    render(<Texto />);

    fireEvent.change(campo(), { target: { value: signo } });
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(campo(), { target: { value: '1,5' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-1.5');
  });

  it('C9: si el valor cambia desde fuera, el «+» lo sigue', () => {
    const { rerender, onChange } = pintar('-2');

    rerender(<CampoDeHandicap id="hcp" value="5" onChange={onChange} />);

    expect(mas()).toHaveAttribute('aria-pressed', 'false');
    expect(campo()).toHaveValue('5');
  });

  it.each([
    ['55', false, true],
    ['54', false, false],
    ['11', true, true],
    ['10', true, false],
  ])('C10: %s (plus %p) fuera de rango: %p', (escrito, conPlus, fuera) => {
    render(<Controlado inicial={conPlus ? '-1' : ''} />);

    fireEvent.change(campo(), { target: { value: escrito } });

    expect(campo().validationMessage).toBe(fuera ? 'handicapField.outOfRange' : '');
    expect(campo()).toHaveAttribute('aria-invalid', String(fuera));
  });

  it('C10b: el aviso del rango, en los dos idiomas', () => {
    expect(es.handicapField.outOfRange).toBe('Entre +10 y 54');
    expect(en.handicapField.outOfRange).toBe('Between +10 and 54');
  });

  it('C16: de texto, con el teclado decimal del móvil', () => {
    pintar('');

    expect(campo()).toHaveAttribute('type', 'text');
    expect(campo()).toHaveAttribute('inputmode', 'decimal');
  });

  it.each([
    ['1,', '1,', '1'],
    ['1,5', '1,5', '1.5'],
    ['1.5', '1.5', '1.5'],
    ['12', '12', '12'],
    [',5', ',5', '0.5'],
  ])('C17: «%s» se ve «%s» y sale «%s»', (escrito, seVe, sale) => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: escrito } });

    expect(campo()).toHaveValue(seVe);
    expect(alCambiar).toHaveBeenLastCalledWith(sale);
  });

  it.each(['1a', '1,2,3', '1,55', '1 5', '123', '1-'])('C18: «%s» no se escribe', (escrito) => {
    const alCambiar = vi.fn();
    render(<Controlado inicial="2" alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: escrito } });

    expect(alCambiar).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('2');
  });

  it.each([
    ['12,', '12'],
    ['12.', '12'],
    ['1,5', '1,5'],
    [',', ''],
  ])('C19: al salir, «%s» se queda «%s»', (escrito, seQueda) => {
    render(<Controlado />);
    fireEvent.change(campo(), { target: { value: escrito } });

    fireEvent.blur(campo());

    expect(campo()).toHaveValue(seQueda);
  });

  it('C19b: el `onBlur` de quien lo usa sigue llegando', () => {
    const alSalir = vi.fn();
    pintar('2', { onBlur: alSalir });

    fireEvent.blur(campo());

    expect(alSalir).toHaveBeenCalledTimes(1);
  });

  it('C20: pegado con espacios alrededor, se escribe sin ellos', () => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: ' +2,4 ' } });

    expect(alCambiar).toHaveBeenLastCalledWith('-2.4');
    expect(campo()).toHaveValue('2,4');
  });

  it('C21: fuera de rango, el formulario no es válido', () => {
    render(<form><Controlado /></form>);

    fireEvent.change(campo(), { target: { value: '60' } });

    expect(campo().closest('form').checkValidity()).toBe(false);
    fireEvent.change(campo(), { target: { value: '6' } });
    expect(campo().closest('form').checkValidity()).toBe(true);
  });

  it('C22: aunque le pasen `ref` o `type`, sigue de texto y con su validez', () => {
    const otraRef = { current: null };
    render(<CampoDeHandicap id="hcp" value="60" onChange={vi.fn()} type="number" ref={otraRef} />);

    expect(campo()).toHaveAttribute('type', 'text');
    expect(campo().validationMessage).toBe('handicapField.outOfRange');
    expect(otraRef.current).toBe(campo());
  });

  it('C22b: con una `ref` de función, también le llega', () => {
    const otraRef = vi.fn();
    render(<CampoDeHandicap id="hcp" value="2" onChange={vi.fn()} ref={otraRef} />);

    expect(otraRef).toHaveBeenCalledWith(campo());
  });

  it('C18b: solo la coma no suelta el «+»', () => {
    const alCambiar = vi.fn();
    render(<Controlado alCambiar={alCambiar} />);
    fireEvent.click(mas());

    fireEvent.change(campo(), { target: { value: ',' } });

    expect(campo()).toHaveValue(',');
    expect(mas()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(campo(), { target: { value: ',5' } });
    expect(alCambiar).toHaveBeenLastCalledWith('-0.5');
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

    expect(campo()).toHaveValue('');
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
