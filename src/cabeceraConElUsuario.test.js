import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Toda cabecera de sesión recibe el usuario (#1129). Sin él, `HeaderAuth`
 * pinta «?» en vez de las iniciales y esconde lo de Admin: pasó en Actividad,
 * la ficha de un jugador y la partida compartida. Un `user={null}` escrito a
 * propósito (Editar perfil sin conexión) cuenta como decidido.
 */

const SRC = join(globalThis.process.cwd(), 'src');

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(jsx|tsx)$/.test(nombre) && !/\.test\.|\.spec\./.test(nombre)
      ? [ruta]
      : [];
  });

const APERTURA = '<HeaderAuth';

/**
 * Recorre los atributos de una etiqueta desde `desde` hasta su `>`. Lo que va
 * entre llaves (una flecha con `>`) o entre comillas (un `title="{"` o
 * `"a > b"`) no cierra la etiqueta ni cuenta como nombre de atributo.
 * Devuelve dónde cierra y el texto de fuera: los nombres de los atributos.
 * Las comillas dentro de unas llaves y los comentarios no se tratan: solo
 * pueden hacer fallar el guardián de más.
 */
const recorreLosAtributos = (texto, desde) => {
  let llaves = 0;
  let comilla = null;
  let fuera = '';
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      if (c === comilla) comilla = null;
    } else if (llaves === 0 && (c === '"' || c === "'")) comilla = c;
    else if (c === '{') llaves++;
    else if (c === '}') llaves--;
    else if (llaves === 0) {
      if (c === '>') return { fin: i, fuera };
      fuera += c;
    }
  }
  return { fin: texto.length - 1, fuera };
};

/** Las etiquetas `<HeaderAuth …>` de un texto, enteras. */
const etiquetasDeLaCabecera = (texto) => {
  const etiquetas = [];
  const re = /<HeaderAuth(?![\w.])/g;
  let m;
  while ((m = re.exec(texto))) {
    const { fin } = recorreLosAtributos(texto, m.index + APERTURA.length);
    etiquetas.push(texto.slice(m.index, fin + 1));
  }
  return etiquetas;
};

const llevaElUsuario = (etiqueta) => {
  const { fuera } = recorreLosAtributos(etiqueta, APERTURA.length);
  // `user={undefined}` vuelve a pintar «?»; un `{...props}` no dice si lo trae
  return (
    /\suser\s*=/.test(fuera) &&
    !/\suser\s*=\s*\{\s*undefined\s*\}/.test(etiqueta)
  );
};

describe('every session header gets the user (#1129)', () => {
  const todas = ficheros(SRC).flatMap((ruta) =>
    etiquetasDeLaCabecera(readFileSync(ruta, 'utf8')).map((etiqueta) => ({
      fichero: relative(SRC, ruta),
      etiqueta,
    })),
  );

  it('finds the headers it guards, the three screens of #1129 among them', () => {
    const conCabecera = new Set(todas.map(({ fichero }) => fichero));
    expect([...conCabecera]).toEqual(
      expect.arrayContaining([
        join('pages', 'player', 'FeedPage.jsx'),
        join('pages', 'player', 'PlayerProfilePage.jsx'),
        join('pages', 'quick_match', 'QuickMatchSharedPage.jsx'),
      ]),
    );
  });

  it('C6: no <HeaderAuth> without a user prop', () => {
    const sinUsuario = todas
      .filter(({ etiqueta }) => !llevaElUsuario(etiqueta))
      .map(({ fichero, etiqueta }) => `${fichero}: ${etiqueta}`);

    expect(sinUsuario).toEqual([]);
  });

  describe('the scanner', () => {
    it.each([
      ['<HeaderAuth />', false],
      ['<HeaderAuth\n/>', false],
      ['<HeaderAuth title={t("a")} />', false],
      ['<HeaderAuth backTo={x} alVolver={() => ir(user)} />', false],
      // Un `user =` dentro de unas llaves no es la prop
      ['<HeaderAuth alVolver={() => { const user = yo; ir(user); }} />', false],
      ['<HeaderAuth user={user} />', true],
      ['<HeaderAuth\n  user={user}\n  alVolver={() => a > b}\n/>', true],
      ['<HeaderAuth user={null} />', true],
      ['<HeaderAuth user={undefined} />', false],
      ['<HeaderAuth user={ undefined } />', false],
      ['<HeaderAuth {...props} />', false],
      // Un ` user=` dentro de un texto entre comillas no es la prop
      ['<HeaderAuth title="para user=x" />', false],
      ["<HeaderAuth title='para user=x' user={user} />", true],
      ['<HeaderAuth {...props} user={user} />', true],
      // Las comillas tampoco cierran ni abren nada al buscar el final
      ['<HeaderAuth title="a > b" user={user} />', true],
      ['<HeaderAuth title="{" user={user} />', true],
    ])('%s → %s', (etiqueta, esperado) => {
      const [leida] = etiquetasDeLaCabecera(`x ${etiqueta} y`);
      expect(leida).toBe(etiqueta);
      expect(llevaElUsuario(leida)).toBe(esperado);
    });

    // CodeRabbit en #1130: una llave entre comillas juntaba las dos cabeceras,
    // y el `user` de la segunda daba por buena a la primera
    it('a quoted brace does not merge a header with the next one', () => {
      const etiquetas = etiquetasDeLaCabecera(
        '<HeaderAuth title="{" />\n<p>x</p>\n<HeaderAuth user={user} />',
      );

      expect(etiquetas).toEqual([
        '<HeaderAuth title="{" />',
        '<HeaderAuth user={user} />',
      ]);
      expect(etiquetas.map(llevaElUsuario)).toEqual([false, true]);
    });

    it('does not take HeaderAuthLike or the import for a header', () => {
      expect(
        etiquetasDeLaCabecera(
          "import HeaderAuth from './HeaderAuth';\n<HeaderAuthLike />",
        ),
      ).toEqual([]);
    });
  });
});
