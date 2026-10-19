/**
 * El mapa del hoyo solo tiene imagen en España: el PNOA del IGN (19 oct). En
 * un campo de otro país no se ofrece; sin saber el país, sí, para que nadie en
 * España pierda el mapa por un dato que falte (una anotación guardada antes).
 */
export const hayMapaEnElPais = (pais) => {
  const codigo = String(pais ?? '').trim().toUpperCase();
  return !codigo || codigo === 'ES';
};
