import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join, relative } from 'path';

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

  it('el verde de la espera es del ARRANQUE, no de cualquier espera', () => {
    // La misma pantalla la usan las transiciones de dentro de la aplicacion
    // —volver a Inicio desde la barra inferior—, y alli el verde de la marca se
    // lee como si la aplicacion se reiniciara (FE #492)
    const bloque = bloqueStandalone(lee('src/index.css'));

    expect(bloque).toMatch(/\.pantalla-de-espera:not\(\.pantalla-de-espera--transicion\)\s*\{[^}]*background:\s*#3e8642/);
    expect(bloque).toContain('html:has(.pantalla-de-espera:not(.pantalla-de-espera--transicion))');
    // Y sin una regla suelta que vuelva a pintarlas todas
    expect(bloque).not.toMatch(/(^|\n)\s*\.pantalla-de-espera\s*\{/);
  });

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
 * Las dos mitades del arranque —la capa de `index.html` y la pantalla de React
 * que la releva— tienen que pintar el MISMO dibujo (FE #495). El anillo puesto
 * en una sola de las dos apareceria de la nada a mitad del arranque, que es la
 * clase de salto que esta saga viene arreglando.
 */
describe('las dos mitades del arranque pintan lo mismo', () => {
  const lee = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');

  it('la capa de index.html tambien lleva el anillo', () => {
    const fuente = lee('index.html');

    expect(fuente).toContain('<span id="arranque-anillo"></span>');
    expect(fuente).toMatch(/#arranque-anillo\s*\{[^}]*animation:\s*arranque-gira/);
  });

  it('el anillo se detiene si se pide menos movimiento, en las dos', () => {
    expect(lee('index.html')).toMatch(/prefers-reduced-motion[\s\S]{0,140}#arranque-anillo\s*\{\s*animation:\s*none/);
    expect(lee('src/components/ui/LoadingMark.jsx')).toContain('motion-reduce:animate-none');
  });

  it('el anillo lleva el mismo color en las dos', () => {
    // La capa no puede leer el tema —ahi todavia no hay CSS de Tailwind—, asi
    // que el color va escrito a mano y solo un test impide que se separen
    const primario = lee('src/index.css').match(/--color-primary-600:\s*(#[0-9a-f]{6})/i)?.[1];
    const html = lee('index.html');

    expect(primario?.toLowerCase()).toBe('#2d7b3e');
    expect(html).toContain('#2d7b3e');
    expect(html).toContain('rgba(45, 123, 62, 0.18)');   // el mismo, al 18%
  });

  it('el anillo gira a la MISMA velocidad en las dos', () => {
    // `animate-spin` de Tailwind es 1s. Con otra duracion aqui, el relevo
    // cambia el ritmo justo en el fotograma que esta saga viene cuidando
    expect(lee('index.html')).toMatch(/animation:\s*arranque-gira\s+1s\s+linear/);
  });

  it('las medidas del dibujo coinciden en las dos', () => {
    // Marco de 128 y marca de 76: si una mitad cambia y la otra no, el
    // monograma da un salto justo en el relevo. Ya paso con el hueco del texto
    const html = lee('index.html');
    const jsx = lee('src/components/ui/LoadingMark.jsx');

    // En la misma unidad las dos, que es justo lo que falta con `size-32`:
    // son 8rem, y con la fuente base en 20px una mitad mide 128 y la otra 160
    expect(html).toMatch(/#arranque-marco\s*\{[^}]*width:\s*128px/);
    expect(html).toMatch(/<img[^>]*width="76"/);
    expect(jsx).toContain("marco: 'w-[128px] h-[128px]'");
    expect(jsx).toContain("marca: 'w-[76px]'");
    expect(jsx, 'las medidas en rem no casan con los pixeles de la capa').not.toMatch(/marco: 'size-\d/);
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

/**
 * El dibujo de las esperas es UNO (FE #495). Este test recorre el fuente porque
 * la primera pasada dejo tres esperas de bloque sin migrar —vivian en
 * `components/`, y el inventario solo habia mirado `pages/`—, y nada lo delataba:
 * la suite seguia verde mientras la aplicacion cambiaba de dibujo por el camino.
 */
describe('no quedan esperas con dibujo propio', () => {
  // Lo que SI puede girar por su cuenta, y por que. Son indicadores de que una
  // ACCION esta en curso —«este boton esta trabajando», «se esta añadiendo»—, no
  // de que un contenido viene de camino: otra cosa, y quedaron fuera del
  // encargo. Cualquier sitio nuevo que aparezca aqui hay que mirarlo, no
  // añadirlo a la lista sin pensar.
  const PERMITIDOS = new Set([
    'components/ui/LoadingMark.jsx',                        // la pieza compartida
    'components/admin/ManageAccountModal.jsx',              // boton de procesar
    'components/auth/SignInForm.jsx',                       // boton de entrar
    'components/modals/ConfirmModal.jsx',                   // boton de confirmar
    'components/competition/CompetitionGolfCoursesSection.jsx', // «añadiendo campo»
    'components/golf_course/GolfCourseSearchBox.jsx',       // indicador dentro del campo
    'pages/ForgotPassword.jsx',                             // boton de enviar
    'pages/Register.jsx',                                   // boton de registrarse
    'pages/ResetPassword.jsx',                              // boton de guardar
    'pages/EditProfile.jsx',                                // boton de guardar
    'pages/admin/AdminPanel.jsx',                           // botones de accion
    'pages/player/FeedPage.jsx',                            // boton de cargar mas
    'pages/player/PlayerProfilePage.jsx',                   // boton de cargar mas
    'components/admin/AdminEditCompetitionModal.jsx',       // boton de guardar
    'components/admin/EditUserModal.jsx',                   // boton de guardar
    'components/friend/AddFriendModal.jsx',                 // indicador dentro del buscador
    'components/invitation/SendInvitationModal.jsx',        // boton de enviar
  ]);

  const ficheros = () => {
    const salida = [];
    const recorre = (dir) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, entrada.name);
        if (entrada.isDirectory()) recorre(ruta);
        else if (/\.jsx?$/.test(entrada.name) && !/\.test\./.test(entrada.name)) salida.push(ruta);
      }
    };
    recorre(resolve(process.cwd(), 'src'));
    return salida;
  };

  it('ninguna pantalla se pinta su propia espera', () => {
    const sueltos = [];
    for (const ruta of ficheros()) {
      // `relative` y no partir por '/src/': si la copia de trabajo vive en una
      // ruta que ya contiene '/src/', ninguna exencion casaria y la suite se
      // pondria roja por donde esta el repositorio
      const relativa = relative(resolve(process.cwd(), 'src'), ruta);
      if (PERMITIDOS.has(relativa)) continue;
      if (readFileSync(ruta, 'utf8').includes('animate-spin')) sueltos.push(relativa);
    }

    expect(sueltos, `esperas con dibujo propio: ${sueltos.join(', ')}`).toEqual([]);
  });

  it('ni su propio esqueleto', () => {
    // `animate-pulse` es la otra forma de decir «esto esta cargando», y el
    // barrido solo miraba los spinners: por ahi se colaron el recuadro amarillo
    // de «Requiere tu Atencion» y los rectangulos grises del panel, que eran un
    // sexto dibujo distinto
    // Lo que late sin ser una espera. Ojo al añadir: `animate-pulse` casi
    // siempre significa «esto esta cargando», y ahi va el dibujo compartido
    const LATIDOS_QUE_NO_SON_ESPERAS = new Set([
      'pages/Competitions.jsx',            // el punto naranja de «solicitudes pendientes»
      'components/profile/AvatarPicker.jsx', // los tres puntos mientras llegan las opciones
    ]);

    const sueltos = [];
    for (const ruta of ficheros()) {
      const relativa = relative(resolve(process.cwd(), 'src'), ruta);
      if (LATIDOS_QUE_NO_SON_ESPERAS.has(relativa)) continue;
      if (readFileSync(ruta, 'utf8').includes('animate-pulse')) sueltos.push(relativa);
    }

    expect(sueltos, `esqueletos propios: ${sueltos.join(', ')}`).toEqual([]);
  });
});
