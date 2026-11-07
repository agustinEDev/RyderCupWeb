import { describe, it, expect } from 'vitest';

// Todos los ficheros de cada idioma: un dato personal en cualquier texto debe saltar
const locales = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' });

/**
 * Datos de contacto y datos personales del titular (6 nov 2026).
 *
 *   #   Dónde                               | Qué
 *   ----|-------------------------------------|------------------------------------------
 *   D1  todos los textos                    | ningún correo personal; el de contacto, admin@
 *   D2  todo salvo el Aviso Legal           | ni NIF ni domicilio (la LSSI los pide solo allí)
 *   D3  el Aviso Legal                      | nombre, NIF, domicilio y admin@ (art. 10 LSSI)
 *   D4  Privacidad                          | nombra al responsable (art. 13 RGPD), sin NIF ni domicilio
 *   D5  el pie y el de competiciones        | © RyderCupFriends, sin el nombre del titular
 */
const ADMIN = 'admin@rydercupfriends.com';
const NIF = '76826889N';
const CALLE = 'Germán Adrio';
const NOMBRE = 'Agustín Estévez';

const textos = (objeto, ruta = '') =>
  typeof objeto === 'string'
    ? [[ruta, objeto]]
    : Object.entries(objeto).flatMap(([clave, valor]) => textos(valor, `${ruta}.${clave}`));

const idiomas = ['es', 'en'].map((idioma) => [
  idioma,
  Object.fromEntries(
    Object.entries(locales)
      .filter(([ruta]) => ruta.startsWith(`./locales/${idioma}/`))
      .map(([ruta, fichero]) => [ruta.split('/').pop().replace(/\.json$/, ''), fichero]),
  ),
]);

describe.each(idiomas)('Datos de contacto (%s)', (_idioma, ficheros) => {
  const todos = Object.entries(ficheros).flatMap(([nombre, f]) => textos(f, nombre));
  const avisoLegal = ficheros.legal.legalNotice.section1.content;

  it('D1: ningún correo personal, y el de contacto es admin@', () => {
    // Sin el ejemplo del campo de correo (tu@ejemplo.com, you@example.com)
    const correos = todos
      .flatMap(([, t]) => t.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [])
      .filter((correo) => !/@(ejemplo|example)\./.test(correo));
    expect(correos.length).toBeGreaterThan(0);
    expect(new Set(correos)).toEqual(new Set([ADMIN]));
    expect(ficheros.contact.info.email).toBe(ADMIN);
  });

  it('D2: NIF y domicilio solo en el Aviso Legal', () => {
    const conDatos = todos.filter(([, t]) => t.includes(NIF) || t.includes(CALLE)).map(([r]) => r);
    expect(conDatos).toEqual(['legal.legalNotice.section1.content']);
  });

  it('D3: el Aviso Legal tiene lo que pide la LSSI', () => {
    for (const dato of [NOMBRE, NIF, CALLE, ADMIN]) expect(avisoLegal).toContain(dato);
  });

  it('D4: Privacidad nombra al responsable', () => {
    expect(ficheros.legal.privacy.section1.content).toContain(NOMBRE);
    expect(ficheros.legal.privacy.section1.content).toContain(ADMIN);
  });

  it('D5: el pie dice RyderCupFriends, no el nombre del titular', () => {
    for (const pie of [ficheros.common.footer.copyright, ficheros.common.footer.copyrightShort, ficheros.competitions.footer]) {
      expect(pie).toContain('© {{year}} RyderCupFriends');
      expect(pie).not.toContain(NOMBRE);
    }
  });
});
