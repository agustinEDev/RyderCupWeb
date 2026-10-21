import { separadorDecimal } from './ajustesDeStrokePlay';

/**
 * Cómo se lee un hándicap (FE #797).
 *
 * Un plus se guarda negativo (-2.0) y en golf se escribe «+2.0»: el signo va al
 * revés que en el número. Solo es para pintar: los cálculos, lo que va a la API
 * y lo guardado siguen con el negativo. No confundir con el «+3» de un
 * resultado contra el par, que significa lo contrario.
 *
 * El cero no lleva signo, ni el que redondea a cero («-0.04» es «0.0»).
 * Sin valor devuelve `null`, y cada pantalla pone lo que ya ponía.
 */
const comoNumero = (valor) => {
  if (typeof valor === 'string' && !valor.trim()) return null;
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

const conSigno = (valor, decimales) => {
  const numero = comoNumero(valor);
  if (numero === null) return null;
  // Se redondea el valor absoluto: los dos lados del cero redondean igual
  const cifras = Math.abs(numero).toFixed(decimales);
  return numero < 0 && Number(cifras) !== 0 ? `+${cifras}` : cifras;
};

/**
 * El índice, con un decimal: «+2.0», «12.4», «0.0». Con idioma, su separador
 * («+2,0» en español); sin él, punto, como el `toFixed` de antes.
 */
export const formatoDeIndice = (valor, idioma) => {
  const texto = conSigno(valor, 1);
  if (texto === null || idioma === undefined) return texto;
  return texto.replace('.', separadorDecimal(idioma));
};

/** El de juego, entero: «+2», «18», «0». */
export const formatoDeHandicapDeJuego = (valor) => conSigno(valor, 0);
