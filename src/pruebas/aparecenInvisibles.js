/**
 * Apunta cada elemento que entra en la página a opacidad 0: así aparece una
 * pantalla con fundido. Para los tests de render de `sinFundidoAlEntrar`
 * (3 nov 2026: ninguna pantalla entra desde invisible).
 *
 * @returns {{vistos: string[], para: () => void}} lo visto y cómo dejar de mirar
 */
export const aparecenInvisibles = () => {
  const vistos = [];
  const mira = (el) => {
    if (el.style?.opacity === '0') vistos.push(el.tagName + (el.dataset?.testid ? `#${el.dataset.testid}` : ''));
  };
  const observador = new globalThis.MutationObserver((cambios) => {
    for (const c of cambios) {
      for (const n of c.addedNodes) {
        if (n.nodeType !== 1) continue;
        mira(n);
        n.querySelectorAll('*').forEach(mira);
      }
    }
  });
  observador.observe(document.body, { childList: true, subtree: true });
  return { vistos, para: () => observador.disconnect() };
};
