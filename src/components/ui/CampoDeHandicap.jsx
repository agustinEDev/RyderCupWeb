import { useState } from 'react';
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
 * @param {string|number|null} value - El hándicap, negativo si es plus
 * @param {(valor: string) => void} onChange - Recibe el texto con su signo
 */
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
  if (texto !== loQueDijo) {
    setLoQueDijo(texto);
    if (texto === '') setPlusSinNumero(false);
  }

  const dice = (valor) => {
    setLoQueDijo(valor);
    onChange(valor);
  };

  const alEscribir = (e) => {
    const escrito = e.target.value.trim();
    // Quien lo escribe con el menos de antes, o con el «+» de los golfistas,
    // también está diciendo «plus» (en un campo de texto llega tal cual)
    const conMenos = escrito.startsWith('-') || escrito.startsWith('+');
    const numero = conMenos ? escrito.slice(1) : escrito;
    const esPlus = plus || conMenos;
    if (numero === '') {
      // Vaciarlo suelta el «+»: si no, lo siguiente salía plus sin quererlo
      // (pasada del Kind, 26 oct). Escribir solo el signo sí lo enciende, y
      // un decimal a medio escribir («1,») llega vacío sin serlo (revisor)
      setPlusSinNumero(e.target.validity?.badInput ? esPlus : conMenos);
      dice('');
      return;
    }
    dice(esPlus ? `-${numero}` : numero);
  };

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
        type="number"
        step="0.1"
        min="0"
        max={plus ? '10' : '54'}
        {...resto}
        value={sinSigno}
        onChange={alEscribir}
        disabled={disabled}
        className={`min-w-0 ${className}`}
      />
    </div>
  );
};

export default CampoDeHandicap;
