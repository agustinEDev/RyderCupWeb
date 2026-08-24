import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { useLayoutEffect } from 'react';

/**
 * La capa de espera de `index.html` se retira cuando React YA ha puesto su
 * contenido en el DOM. El orden importa y ya fallo dos veces:
 *
 * - Con `requestAnimationFrame`: esa funcion no se ejecuta si la pagina no esta
 *   pintando, asi que la capa se quedaba encima para siempre tapando una
 *   aplicacion que por debajo funcionaba.
 * - Retirandola justo despues de pedir el render: React no pinta en ese
 *   instante, solo lo programa, asi que la capa se iba antes de que hubiera
 *   nada debajo y se veia el fondo blanco de la pagina.
 *
 * Aqui se comprueba lo unico que evita las dos: cuando la capa desaparece, ya
 * hay contenido.
 */
const Retira = () => {
  useLayoutEffect(() => {
    document.getElementById('arranque')?.remove();
  }, []);
  return null;
};

describe('la retirada de la capa de espera', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="arranque"></div>';
  });

  it('cuando la capa se va, ya hay contenido pintado', () => {
    const { container } = render(
      <>
        <Retira />
        <main data-testid="contenido">pantalla</main>
      </>
    );

    // Las dos cosas, en el mismo commit: sin capa y con contenido
    expect(document.getElementById('arranque')).toBeNull();
    expect(container.querySelector('[data-testid="contenido"]')).toBeInTheDocument();
  });

  it('no falla si la capa no existe', () => {
    document.body.innerHTML = '';

    expect(() => render(<Retira />)).not.toThrow();
  });
});

/**
 * La franja de arriba —reloj, cobertura, bateria— no la pinta la pantalla de
 * espera: la pinta el fondo del documento. Sin fondo en `html` quedaba una
 * banda blanca cruzando una pantalla verde en la app instalada. La regla vive
 * en dos sitios a proposito: el estilo en linea de `index.html` se aplica desde
 * el primer instante, e `index.css` la mantiene cuando ya manda React.
 */
describe('el fondo del documento en la app instalada', () => {
  const lee = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');
  // El bloque entero contando llaves, no una ventana de N caracteres: los
  // comentarios de estas reglas son largos y una ventana fija se los come
  const bloqueStandalone = (fuente) => {
    const desde = fuente.indexOf('@media (display-mode: standalone)');
    if (desde === -1) return '';
    let nivel = 0;
    for (let i = fuente.indexOf('{', desde); i < fuente.length; i += 1) {
      if (fuente[i] === '{') nivel += 1;
      if (fuente[i] === '}') {
        nivel -= 1;
        if (nivel === 0) return fuente.slice(desde, i + 1);
      }
    }
    return fuente.slice(desde);
  };

  it.each([['index.html'], ['src/index.css']])(
    '%s pinta de verde el documento mientras se espera',
    (ruta) => {
      const bloque = bloqueStandalone(lee(ruta));

      expect(bloque).toMatch(/html:has\(#arranque\)[^{]*\{[^}]*background:\s*#335d35/);
    }
  );

  it('el verde va condicionado, no puesto en el html a secas', () => {
    // Sin condicion, el verde se quedaba toda la sesion por debajo de las
    // pantallas sin fondo propio —las esperas de Perfil, Editar perfil, Crear
    // competicion— y ahi su texto gris no se lee.
    for (const ruta of ['index.html', 'src/index.css']) {
      const bloque = bloqueStandalone(lee(ruta));

      expect(bloque).not.toMatch(/(^|\n)\s*html\s*\{/);
    }
  });
});

/**
 * Lo de arriba comprueba la MECANICA sobre una copia del componente, y por si
 * sola una copia no prueba nada: borrar `<RetiraLaCapaDeEspera />` de `App.jsx`
 * o devolverlo a `main.jsx` dejaria la suite en verde. Estas tres, sobre el
 * fuente, son las que atan el arreglo a donde tiene que estar —la misma forma
 * que usan `toastPlacement.test.jsx` y `rutasPublicas.test.js`—.
 */
describe('donde vive la retirada de la capa', () => {
  const lee = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');

  it('App.jsx monta el componente', () => {
    expect(lee('src/App.jsx')).toContain('<RetiraLaCapaDeEspera />');
  });

  it('main.jsx ya no la retira: ahi React todavia no ha pintado nada', () => {
    expect(lee('src/main.jsx')).not.toContain("getElementById('arranque')");
  });

  it('se monta fuera de los dos error boundaries', () => {
    // Dentro, una excepcion durante el render dejaba la capa tapando la
    // pantalla de error hasta que el CSS la apartaba seis segundos despues.
    const fuente = lee('src/App.jsx');
    const montaje = fuente.indexOf('<RetiraLaCapaDeEspera />');
    const boundary = fuente.indexOf('<Sentry.ErrorBoundary');

    expect(montaje).toBeGreaterThan(-1);
    expect(boundary).toBeGreaterThan(-1);
    expect(montaje).toBeLessThan(boundary);
  });
});

/**
 * El monograma tiene que caer en el mismo sitio en la capa de `index.html` y en
 * la pantalla que la releva, o se ve dar un salto justo en el cambio.
 */
describe('la continuidad del monograma en el relevo', () => {
  it('la capa reserva el hueco de la linea de texto', () => {
    const fuente = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(fuente).toContain('<div id="arranque-hueco"></div>');
    expect(fuente).toMatch(/#arranque-hueco\s*\{[^}]*margin-top:\s*1rem/);
    expect(fuente).toMatch(/#arranque-hueco\s*\{[^}]*height:\s*1\.5rem/);
    expect(fuente).toMatch(/#arranque\s*\{[^}]*flex-direction:\s*column/);
  });
});
