import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Salir de la aplicación es UNA cosa (FE #531).
 *
 * La cabecera y el perfil tenían cada uno su copia —petición al backend,
 * aviso a las otras pestañas y `window.location.href`—, y la del perfil no
 * limpiaba nada. En móvil esa es la ÚNICA salida que hay, porque allí la
 * cabecera no tiene menú (FE #306): el arreglo aplicado solo en la cabecera
 * dejaba el móvil igual que estaba, con el nombre, el correo, el hándicap y
 * las partidas guardadas de la cuenta anterior.
 *
 * Es una aserción sobre el fuente porque lo que hay que fijar es que no vuelva
 * a haber una segunda copia: un render solo prueba la pantalla que monta, y
 * fue justamente la que no se montó la que se quedó sin arreglar.
 */
const lee = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');

const PANTALLAS_CON_SALIDA = [
  ['el perfil', 'src/pages/Profile.jsx'],
  ['la cabecera', 'src/components/layout/HeaderAuth.jsx'],
];

describe('salir va por un solo sitio (FE #531)', () => {
  it.each(PANTALLAS_CON_SALIDA)('%s sale por `useLogout`', (_, ruta) => {
    expect(lee(ruta)).toContain("import { useLogout } from");
  });

  it.each(PANTALLAS_CON_SALIDA)('%s no se fabrica su propia salida', (_, ruta) => {
    const fuente = lee(ruta);

    // Los tres trozos de la copia: sin ellos no hay salida paralela que pueda
    // olvidarse de limpiar
    expect(fuente).not.toContain('logoutUseCase');
    expect(fuente).not.toContain('broadcastLogout');
    expect(fuente).not.toContain("window.location.href = '/'");
  });
});
