import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * El hándicap a mano, con su «+» al lado (QA del 26 oct, FE #938).
 *
 * Un plus se guarda negativo (-1.5) y en golf se dice «+1.5». Había que
 * escribir «-1.5», y el teclado decimal del móvil no tiene signo. Aquí el
 * número va sin signo y el botón dice si es plus, como en el teclado de la
 * partida rápida. Hacia fuera, el valor de siempre: el texto con el signo que
 * guarda el backend, así que quien lo usa lo lee y lo envía como antes.
 *
 * Es de texto con teclado decimal, no numérico: el numérico esconde lo que hay
 * escrito mientras no es un número entero («1,» llegaba vacío) y no deja ver el
 * signo. Se ve lo que se escribe, con su coma, y sale con punto (26 oct).
 *
 * @param {string|number|null} value - El hándicap, negativo si es plus
 * @param {(valor: string) => void} onChange - Recibe el texto con su signo
 */
// Signo opcional, hasta dos cifras y un decimal, con coma o punto
const FORMA_DEL_HANDICAP = /^([+-]?)(\d{0,2})(?:[.,](\d?))?$/;

const CampoDeHandicap = ({ value, onChange, disabled, className = '', ...resto }) => {
  const { t } = useTranslation('common');
  const texto = String(value ?? '');
  const conSigno = texto.startsWith('-');
  const sinSigno = conSigno ? texto.slice(1) : texto;
  // Con el campo vacío el valor no dice si es plus: lo recuerda el botón
  const [plusSinNumero, setPlusSinNumero] = useState(false);
  const plus = sinSigno === '' ? plusSinNumero : conSigno;
  // Lo último que dijo el campo: si quien lo usa lo vacía por su cuenta
  // (cancelar, tras guardar), el «+» recordado ya no vale (revisor)
  const [loQueDijo, setLoQueDijo] = useState(texto);
  // Lo que se ve, tal cual se escribió: «1,» sale como «1» pero se sigue viendo
  const [enPantalla, setEnPantalla] = useState(sinSigno);
  if (texto !== loQueDijo) {
    setLoQueDijo(texto);
    setEnPantalla(sinSigno);
    if (texto === '') setPlusSinNumero(false);
  }

  const dice = (valor) => {
    setLoQueDijo(valor);
    onChange(valor);
  };

  const alEscribir = (e) => {
    const forma = FORMA_DEL_HANDICAP.exec(e.target.value);
    // Lo que no es un hándicap no se escribe
    if (!forma) return;
    const [, signo, entero, decimal = ''] = forma;
    // Quien lo escribe con el menos de antes, o con el «+» de los golfistas,
    // también está diciendo «plus»
    const conMenos = signo !== '';
    const esPlus = plus || conMenos;
    const loQueSeVe = e.target.value.slice(signo.length);
    setEnPantalla(loQueSeVe);
    const numero = entero === '' && decimal === '' ? '' : `${entero || '0'}${decimal ? `.${decimal}` : ''}`;
    if (numero === '') {
      // Vaciarlo suelta el «+»: si no, lo siguiente salía plus sin quererlo
      // (pasada del Kind, 26 oct). Escribir solo el signo sí lo enciende, y
      // la coma sola espera al número sin soltarlo
      setPlusSinNumero(loQueSeVe === '' ? conMenos : esPlus);
      dice('');
      return;
    }
    dice(esPlus ? `-${numero}` : numero);
  };

  // Fuera de rango no se envía el formulario, como hacía el numérico con su
  // max, pero con el aviso en su idioma
  const fueraDeRango = sinSigno !== '' && Number(sinSigno) > (plus ? 10 : 54);
  const campo = useRef(null);
  useEffect(() => {
    campo.current?.setCustomValidity(fueraDeRango ? t('handicapField.outOfRange') : '');
  }, [fueraDeRango, t]);

  const alPulsarMas = () => {
    if (sinSigno === '') {
      setPlusSinNumero(!plus);
      return;
    }
    dice(plus ? sinSigno : `-${sinSigno}`);
  };

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={alPulsarMas}
        disabled={disabled}
        aria-pressed={plus}
        aria-label={t('handicapField.plus')}
        className={`shrink-0 min-w-11 rounded-lg border px-3 text-lg font-bold transition-colors disabled:opacity-50 ${
          plus ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        +
      </button>
      <input
        ref={campo}
        type="text"
        inputMode="decimal"
        aria-invalid={fueraDeRango}
        {...resto}
        value={enPantalla}
        onChange={alEscribir}
        disabled={disabled}
        className={`min-w-0 ${className}`}
      />
    </div>
  );
};

export default CampoDeHandicap;
