import { describe, it, expect } from 'vitest';

/**
 * Todo modal se anuncia como diálogo.
 *
 * En la prueba en bloque del 4 oct 2026, 19 capas de modal (`fixed inset-0`)
 * no tenían `role="dialog"`: un lector de pantalla leía la página de debajo
 * como si nada la tapara, el foco se escapaba detrás y Escape no cerraba.
 * Pasaron a `ModalShell`. Este test lee el código de todas las pantallas y
 * falla si vuelve a aparecer una capa sin diálogo dentro: o la pinta
 * `ModalShell`, o declara su `role="dialog"` en sus primeros elementos (las
 * hojas inferiores lo ponen en la hoja, con el fondo de `presentation`).
 */
const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx', '!/src/components/ui/ModalShell.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const capasSinDialogo = (codigo) => {
  const sin = [];
  let desde = codigo.indexOf('fixed inset-0');
  while (desde !== -1) {
    const inicio = codigo.lastIndexOf('<', desde);
    const trozo = codigo.slice(inicio, inicio + 1500);
    if (!/role=["{]["']?(dialog|alertdialog)/.test(trozo)) {
      sin.push(codigo.slice(0, inicio).split('\n').length);
    }
    desde = codigo.indexOf('fixed inset-0', desde + 1);
  }
  return sin;
};

describe('Modales', () => {
  it('el detector encuentra una capa sin diálogo y deja pasar las que lo tienen', () => {
    expect(capasSinDialogo('<div className="fixed inset-0 bg-black/50"><div>Hola</div></div>')).toEqual([1]);
    expect(capasSinDialogo('<div className="fixed inset-0" role="dialog">Hola</div>')).toEqual([]);
    expect(
      capasSinDialogo('<div className="fixed inset-0" role="presentation">\n  <div role="dialog">Hoja</div>\n</div>')
    ).toEqual([]);
  });

  it('en toda la app, toda capa de modal se anuncia como diálogo', () => {
    const sin = Object.entries(fuentes)
      .map(([fichero, codigo]) => [fichero, capasSinDialogo(codigo)])
      .filter(([, lineas]) => lineas.length > 0)
      .map(([fichero, lineas]) => `${fichero}:${lineas.join(',')}`);

    expect(Object.keys(fuentes).length).toBeGreaterThan(100);
    expect(sin).toEqual([]);
  });
});
