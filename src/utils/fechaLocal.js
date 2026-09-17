/**
 * El día del calendario de quien mira, como `AAAA-MM-DD` (FE #615).
 *
 * No vale `toISOString().slice(0, 10)`: eso es el día en UTC, y en España
 * entre las doce y las dos de la madrugada todavía dice «ayer». Con el formato
 * de `roundDate` se compara como texto sin convertir nada.
 */
export const fechaLocal = (fecha = new Date()) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};
