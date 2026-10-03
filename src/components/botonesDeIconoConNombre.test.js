import { describe, it, expect } from 'vitest';

/**
 * Ningún botón que solo lleve un icono se queda sin nombre.
 *
 * En la prueba en bloque del 4 oct 2026 salieron quince: la X de quitar un país
 * adyacente, las papeleras de los campos, la X de cerrar de nueve modales y la de
 * quitar al invitado elegido. Un lector de pantalla los anunciaba como «botón»,
 * sin más. Este test lee el código de todas las pantallas para que no vuelva a
 * colarse uno: un botón cuyo único contenido es un icono necesita `aria-label`.
 */
const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const BOTON = /<button\b([^>]*?)>([\s\S]*?)<\/button>/g;
const ICONO = /<[A-Z]\w*\b[^>]*\/>/g;
const COMENTARIO = /\{\/\*[\s\S]*?\*\/\}/g;

const botonesSinNombre = (codigo) => {
  const encontrados = [];
  for (const [entero, atributos, contenido] of codigo.matchAll(BOTON)) {
    if (/aria-label|aria-labelledby|title=/.test(atributos)) continue;
    const tieneIcono = ICONO.test(contenido);
    ICONO.lastIndex = 0;
    const resto = contenido.replace(ICONO, '').replace(COMENTARIO, '').trim();
    if (tieneIcono && resto === '') encontrados.push(entero.split('\n')[0].trim());
  }
  return encontrados;
};

describe('Botones de solo icono', () => {
  it('el detector encuentra uno sin nombre y deja pasar los nombrados', () => {
    expect(botonesSinNombre('<button onClick={f}>\n  <X className="w-4" />\n</button>')).toHaveLength(1);
    expect(botonesSinNombre('<button aria-label={t("close")}><X /></button>')).toEqual([]);
    expect(botonesSinNombre('<button><X /> {t("close")}</button>')).toEqual([]);
  });

  it('en toda la app, todos tienen nombre', () => {
    const sinNombre = Object.entries(fuentes)
      .map(([fichero, codigo]) => [fichero, botonesSinNombre(codigo).length])
      .filter(([, cuantos]) => cuantos > 0)
      .map(([fichero, cuantos]) => `${fichero} (${cuantos})`);

    expect(Object.keys(fuentes).length).toBeGreaterThan(100);
    expect(sinNombre).toEqual([]);
  });
});
