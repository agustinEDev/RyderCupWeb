/**
 * Lee un entero de lo que se ha escrito en un campo, sin inventarse nada.
 *
 * `Number.parseInt` se queda con el principio y tira el resto: «24.5» son 24 y
 * «12players» son 12. Mientras el campo está montado el navegador lo tapa, pero
 * en cuanto se pliega —o se pega un valor— al servidor llega un número que nadie
 * escribió (CodeRabbit, PR #642).
 *
 * `Number` tiene la trampa contraria y es peor: `Number('   ')` y `Number([])`
 * valen 0, y un cupo de 0 jugadores es una competición que nadie puede jugar.
 *
 * Devuelve `null` si lo escrito no es un entero limpio.
 */
export const numeroEntero = (valor) => {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? valor : null;
  }
  if (typeof valor !== 'string' || !valor.trim()) return null;

  const numero = Number(valor.trim());
  return Number.isInteger(numero) ? numero : null;
};
