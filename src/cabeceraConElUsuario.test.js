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

/**
 * Las etiquetas `<HeaderAuth …>` de un texto, enteras: las llaves de los
 * atributos pueden llevar `>` (una flecha) y no cierran la etiqueta.
 */
const etiquetasDeLaCabecera = (texto) => {
  const etiquetas = [];
  const re = /<HeaderAuth(?![\w.])/g;
  let m;
  while ((m = re.exec(texto))) {
    let llaves = 0;
    let i = m.index + m[0].length;
    for (; i < texto.length; i++) {
      const c = texto[i];
      if (c === '{') llaves++;
      else if (c === '}') llaves--;
      else if (c === '>' && llaves === 0) break;
    }
    etiquetas.push(texto.slice(m.index, i + 1));
  }
  return etiquetas;
};

const llevaElUsuario = (etiqueta) => {
  // Solo los atributos de la etiqueta, sin lo que va entre llaves
  let fuera = '';
  let llaves = 0;
  for (const c of etiqueta) {
    if (c === '{') llaves++;
    else if (c === '}') llaves--;
    else if (llaves === 0) fuera += c;
  }
  return /\suser\s*=/.test(fuera) || /\{\s*\.\.\./.test(etiqueta);
};

describe('every session header gets the user (#1129)', () => {
  const todas = ficheros(SRC).flatMap((ruta) =>
    etiquetasDeLaCabecera(readFileSync(ruta, 'utf8')).map((etiqueta) => ({
      fichero: relative(SRC, ruta),
      etiqueta,
    })),
  );

  it('finds the headers it guards', () => {
    expect(todas.length).toBeGreaterThan(30);
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
      ['<HeaderAuth {...props} />', true],
    ])('%s → %s', (etiqueta, esperado) => {
      const [leida] = etiquetasDeLaCabecera(`x ${etiqueta} y`);
      expect(leida).toBe(etiqueta);
      expect(llevaElUsuario(leida)).toBe(esperado);
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
