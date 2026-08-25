import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

      expect(bloque).toMatch(/html:has\(#arranque\)[^{]*\{[^}]*background:\s*#3e8642/);
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
 * La MECANICA de la cortina se prueba en `hooks/useCortinaDeArranque.test.jsx`
 * y en `utils/cortinaDeArranque.test.js`, sobre el codigo de verdad. Lo que
 * falta es atarla a donde tiene que estar: si nadie la monta, o si se monta en
 * un sitio donde no llega a correr, aquellos tests siguen en verde y la
 * aplicacion arranca rota. La misma forma que usan `toastPlacement.test.jsx` y
 * `rutasPublicas.test.js`.
 */
describe('donde vive la cortina del arranque', () => {
  const lee = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');

  it('App.jsx la engancha a la ruta que hay en pantalla', () => {
    expect(lee('src/App.jsx')).toContain('useCortinaDeArranque(location.pathname)');
  });

  it('main.jsx no la retira: ahi React todavia no ha pintado nada', () => {
    expect(lee('src/main.jsx')).not.toContain("getElementById('arranque')");
  });

  it('solo el modulo de la cortina toca la capa', () => {
    // Un `remove()` suelto por ahi la levantaria antes de tiempo y nadie se
    // enteraria: volveria el pantallazo, y esta vez sin dejar rastro
    const sospechosos = ['src/App.jsx', 'src/main.jsx', 'src/pages/Dashboard.jsx', 'src/pages/AppStart.jsx'];

    for (const ruta of sospechosos) {
      expect(lee(ruta), `${ruta} manipula la capa por su cuenta`).not.toContain("getElementById('arranque')");
    }
  });

  it('las TRES pantallas de destino avisan', () => {
    // Una por cada entrada de `RUTAS_QUE_AVISAN`. Sin el aviso, esa ruta se come
    // el plazo entero en cada arranque, y la portada es justo por donde entran
    // los iconos anteriores a FE #465
    expect(lee('src/pages/Dashboard.jsx')).toContain('laPantallaEstaLista()');
    expect(lee('src/pages/AppStart.jsx')).toContain('laPantallaEstaLista()');
    expect(lee('src/pages/Landing.jsx')).toContain('laPantallaEstaLista()');
  });

  it('las dos pantallas de error la levantan', () => {
    // Antes la retirada vivia FUERA de los error boundaries por esto: dentro,
    // una excepcion durante el render dejaba la capa tapando la pantalla de
    // error hasta que el CSS la apartaba seis segundos despues. Ahora la
    // decision es de la ruta y va dentro, asi que cada fallback tiene que
    // levantarla el mismo.
    expect(lee('src/App.jsx')).toMatch(/const ErrorFallback[\s\S]{0,600}retiraLaCortina\(\)/);
    expect(lee('src/components/errors/LazyLoadErrorBoundary.jsx')).toContain('retiraLaCortina()');
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

/**
 * El verde de la pantalla de arranque no es libre: encima de el se leen dos
 * cosas que no controlamos igual.
 *
 * - La barra de estado del sistema —reloj, cobertura, bateria—. En la
 *   aplicacion instalada esa franja la pinta el fondo del documento, y con
 *   `apple-mobile-web-app-status-bar-style: default` sus simbolos son oscuros.
 *   El verde anterior (#335d35) dejaba esos simbolos en 2.76:1 y no se leian;
 *   se reporto desde un iPhone.
 * - El monograma y el «Cargando...», que van en blanco.
 *
 * Los dos tiran en sentidos opuestos: aclarar el fondo ayuda al reloj y
 * perjudica al blanco. Este test fija que ninguno de los dos se quede corto,
 * para que oscurecer o aclarar el verde no vuelva a romper uno de ellos en
 * silencio.
 */
describe('el verde del arranque deja leer lo que va encima', () => {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = (hex) => {
    const n = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  const contraste = (a, b) => {
    const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (alto + 0.05) / (bajo + 0.05);
  };

  const verdeDeArranque = () => {
    const fuente = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const encontrado = fuente.match(/#arranque\s*\{\s*background:\s*(#[0-9a-f]{6})/i);
    return encontrado?.[1];
  };

  it('el mismo verde en index.html, index.css y el manifiesto', () => {
    // Tres sitios pintan la secuencia de arranque; si se separan, vuelve el
    // salto de color que este trabajo vino a quitar
    const verde = verdeDeArranque();

    expect(verde).toBeTruthy();
    expect(readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')).toContain(verde);
    expect(readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf8')).toContain(verde);
  });

  it('el reloj y la bateria del sistema se leen encima', () => {
    expect(contraste(verdeDeArranque(), '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('el monograma y el texto en blanco se leen encima', () => {
    expect(contraste(verdeDeArranque(), '#ffffff')).toBeGreaterThanOrEqual(4.4);
  });
});
