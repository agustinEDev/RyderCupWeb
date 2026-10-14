/**
 * Un UUID v4 (FE #848). `crypto.randomUUID` solo existe en contextos seguros y
 * en Safari 15.4+: por http con la IP de la red local, o en un iPhone viejo,
 * no está. `getRandomValues` sí, y con él se arma el mismo formato.
 *
 * @returns {string}
 */
export const idAleatorio = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versión 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
