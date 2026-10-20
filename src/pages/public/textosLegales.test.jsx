import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import es from '../../i18n/locales/es/legal.json';
import en from '../../i18n/locales/en/legal.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../../components/layout/Header', () => ({ default: () => null }));
vi.mock('../../components/layout/Footer', () => ({ default: () => null }));

const { default: Privacy } = await import('./Privacy');
const { default: Terms } = await import('./Terms');
const { default: Cookies } = await import('./Cookies');

/**
 * Privacidad, Términos y Cookies tras la auditoría legal del 20 oct 2026.
 *
 * Se mira el texto de los dos idiomas: lo que dice la política es lo que hay que
 * fijar, y una traducción que se queda atrás promete otra cosa.
 */

const IDIOMAS = [
  ['es', es],
  ['en', en],
];

const texto = (bloque) => JSON.stringify(bloque);

const TITULAR = ['Agustín Estévez Domínguez', '76826889N', 'Germán Adrio Sobrido, 10 - 1D', '36003 Pontevedra'];
const CORREO = 'agustin.estevez.dominguez@gmail.com';

describe('cada página pinta todas las secciones de su texto', () => {
  // Las páginas recorren una lista de secciones escrita a mano: una sección
  // nueva en el JSON que no se añade a la lista no sale en pantalla
  it.each([
    ['privacy', Privacy],
    ['terms', Terms],
    ['cookies', Cookies],
  ])('%s', (bloque, Pagina) => {
    render(
      <MemoryRouter>
        <Pagina />
      </MemoryRouter>
    );

    const secciones = Object.keys(es[bloque]).filter((k) => k.startsWith('section'));
    const pintadas = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

    expect(pintadas).toEqual(secciones.map((s) => `${bloque}.${s}.title`));
  });
});

describe('Política de Privacidad', () => {
  it.each(IDIOMAS)('P1 (%s): identifica al responsable con nombre, NIF, domicilio y correo', (_i, textos) => {
    const p = texto(textos.privacy);

    for (const dato of [...TITULAR, CORREO]) expect(p).toContain(dato);
  });

  it.each([
    ['es', es, [/contrato/i, /interés legítimo/i, /consentimiento/i, /geolocalizaci/i]],
    ['en', en, [/contract/i, /legitimate interest/i, /consent/i, /location/i]],
  ])('P2 (%s): da la base legal de cada tratamiento', (_i, textos, patrones) => {
    const p = texto(textos.privacy);

    for (const patron of patrones) expect(p).toMatch(patron);
  });

  it.each([
    ['es', es, [/Marco de Privacidad de Datos/i, /cláusulas contractuales tipo/i]],
    ['en', en, [/Data Privacy Framework/i, /standard contractual clauses/i]],
  ])('P3 (%s): nombra a los proveedores y las transferencias internacionales', (_i, textos, patrones) => {
    const p = texto(textos.privacy);

    for (const proveedor of ['Render', 'Sentry', 'Mailgun', 'Cloudflare', 'Google']) expect(p).toContain(proveedor);
    for (const patron of patrones) expect(p).toMatch(patron);
  });

  it.each([
    ['es', es, [/RFEG/, /a petición/i, /geolocalizaci/i, /foto/i, /amistades|amigos/i, /competiciones públicas/i, /Session Replay/]],
    ['en', en, [/RFEG/, /at your request/i, /location/i, /photo/i, /friends/i, /public competitions/i, /Session Replay/]],
  ])('P4 (%s): hándicap de la RFEG, ubicación, fotos, amistades, resultados públicos y Replay', (_i, textos, patrones) => {
    const p = texto(textos.privacy);

    for (const patron of patrones) expect(p).toMatch(patron);
  });

  it.each([
    ['es', es, /género/i, /obligatorio/i, /barras/i, /género \(opcional\)|género.{0,20}opcional/i],
    ['en', en, /gender/i, /required/i, /tees/i, /gender \(optional\)|gender.{0,20}optional/i],
  ])('P5 (%s): el género es obligatorio y se dice para qué', (_i, textos, genero, obligatorio, barras, opcional) => {
    const p = texto(textos.privacy);

    expect(p).toMatch(genero);
    expect(p).toMatch(obligatorio);
    expect(p).toMatch(barras);
    expect(p).not.toMatch(opcional);
  });

  it.each([
    ['es', es, /portabilidad/i, /un mes/i, /(eliminar|borrar) tu cuenta[^"]{0,60}(perfil|configuración)/i],
    ['en', en, /portability/i, /one month/i, /delete your account[^"]{0,60}(profile|settings)/i],
  ])('P6 (%s): el borrado y la portabilidad se piden por correo y se atienden en un mes', (_i, textos, portabilidad, plazo, desdeElPerfil) => {
    const p = texto(textos.privacy);

    expect(p).toMatch(portabilidad);
    expect(p).toMatch(plazo);
    expect(p).toContain(CORREO);
    expect(p).not.toMatch(desdeElPerfil);
  });

  it.each(IDIOMAS)('P7 (%s): derecho a reclamar ante la AEPD', (_i, textos) => {
    const p = texto(textos.privacy);

    expect(p).toContain('AEPD');
    expect(p).toContain('www.aepd.es');
  });

  it.each([
    ['es', es, '20 de octubre de 2026'],
    ['en', en, '20 October 2026'],
  ])('fecha de la última actualización (%s)', (_i, textos, fecha) => {
    expect(textos.privacy.lastUpdated).toContain(fecha);
    expect(textos.terms.lastUpdated).toContain(fecha);
    expect(textos.cookies.lastUpdated).toContain(fecha);
  });
});

describe('Términos de Servicio', () => {
  it.each(IDIOMAS)('T1 (%s): identifican al titular', (_i, textos) => {
    const t = texto(textos.terms);

    for (const dato of ['Agustín Estévez Domínguez', '76826889N', CORREO]) expect(t).toContain(dato);
    expect(t).not.toMatch(/operado por RyderCupFriends|operated by RyderCupFriends/i);
  });

  it.each([
    ['es', es, /antelación/i, /efectivas? inmediatamente|efecto inmediato/i],
    ['en', en, /notice/i, /effective immediately|immediate effect/i],
  ])('T2 (%s): los cambios se avisan con antelación', (_i, textos, antelacion, inmediato) => {
    const t = texto(textos.terms);

    expect(t).toMatch(antelacion);
    expect(t).not.toMatch(inmediato);
  });

  it.each([
    ['es', es, [/dolo/i, /culpa grave/i, /consumidor/i]],
    ['en', en, [/wilful misconduct/i, /gross negligence/i, /consumer/i]],
  ])('T3 (%s): la responsabilidad limitada no excluye dolo, culpa grave ni los derechos del consumidor', (_i, textos, patrones) => {
    const t = texto(textos.terms);

    for (const patron of patrones) expect(t).toMatch(patron);
  });

  it.each([
    ['es', es, /ley española/i, /país de residencia/i, /denunciar/i],
    ['en', en, /Spanish law/i, /country of residence/i, /report/i],
  ])('T4 (%s): ley española sin quitar al consumidor los derechos de su país, y cómo denunciar contenidos', (_i, textos, ley, residencia, denunciar) => {
    const t = texto(textos.terms);

    expect(t).toMatch(ley);
    expect(t).toMatch(residencia);
    expect(t).toMatch(denunciar);
    expect(t).toContain(CORREO);
  });

  it.each([
    ['es', es, /(eliminar|borrar) tu cuenta[^"]{0,60}(perfil|configuración)/i],
    ['en', en, /delete your account[^"]{0,60}(profile|settings)/i],
  ])('T4 (%s): no promete borrar la cuenta desde el perfil, que no existe', (_i, textos, desdeElPerfil) => {
    expect(texto(textos.terms)).not.toMatch(desdeElPerfil);
  });
});

describe('Política de Cookies', () => {
  it.each([
    ['es', es, /pueden establecer sus propias cookies/i],
    ['en', en, /may set their own cookies/i],
  ])('C1 (%s): explica Session Replay y concreta la cookie de Cloudflare', (_i, textos, vago) => {
    const c = texto(textos.cookies);

    expect(c).toContain('Session Replay');
    expect(c).toContain('__cf_bm');
    expect(c).not.toMatch(vago);
  });
});

// Revisión de la auditoría (decisiones de Agustín): los textos dicen lo que el
// backend hace de verdad
describe('lo que pasa al pedir la baja (B1)', () => {
  const bloques = (textos) => [textos.privacy.section9.content, textos.privacy.section10.content, textos.terms.section8.content];

  it.each([
    ['es', es, /desactiv/i, /un mes/i, /resultados/i, /tarjetas/i, /competiciones que (has )?creado|competiciones creadas/i],
    ['en', en, /deactivat/i, /one month/i, /results/i, /scorecards/i, /competitions you (have )?created/i],
  ])('%s: se desactiva, se suprime lo no ligado a otros y se responde en un mes', (_i, textos, ...patrones) => {
    const todo = bloques(textos).join(' ');

    for (const patron of patrones) expect(todo).toMatch(patron);
  });

  // Cada texto lo dice por sí mismo: quien lee los Términos no tiene por qué
  // leer la Política de Privacidad (una mutación lo demostró: borrar la
  // desactivación de la Privacidad pasaba porque los Términos la decían)
  it.each([
    ['es', es, /desactiv/i, /se conservan/i],
    ['en', en, /deactivat/i, /kept/i],
  ])('%s: la Privacidad y los Términos dicen cada uno que se desactiva y qué se conserva', (_i, textos, desactiva, conserva) => {
    for (const bloque of [textos.privacy.section9.content, textos.terms.section8.content]) {
      expect(bloque).toMatch(desactiva);
      expect(bloque).toMatch(conserva);
    }
  });

  it.each([
    ['es', es, /anonimiz/i, /eliminamos tus datos personales en el plazo de un mes/i],
    ['en', en, /anonymi[sz]/i, /erase your personal data within one month/i],
  ])('%s: ni «anonimizados» ni «se borra todo en un mes»', (_i, textos, anonimo, todoEnUnMes) => {
    const todo = bloques(textos).join(' ');

    expect(todo).not.toMatch(anonimo);
    expect(todo).not.toMatch(todoEnUnMes);
  });
});

describe('cuándo se consulta la RFEG (M3)', () => {
  it.each([
    ['es', es, [/a petición/i, /organizador/i, /cierr\w* (de )?las inscripciones/i, /capitanes/i, /España/, /personalizado/i], /a mano/i],
    ['en', en, [/at your request/i, /organiser/i, /enrolment closes|closing enrolment/i, /captains/i, /Spain/, /custom handicap/i], /manually/i],
  ])('%s: a petición, por el organizador y al cerrar inscripciones o nombrar capitanes', (_i, textos, patrones, aMano) => {
    const texto = textos.privacy.section4.content;

    for (const patron of patrones) expect(texto).toMatch(patron);
    expect(texto).not.toMatch(aMano);
  });
});

describe('servidores de ortofotos como destinatarios (M4)', () => {
  it.each([
    ['es', es, /dirección IP/i, /mapa/i],
    ['en', en, /IP address/i, /map/i],
  ])('%s: reciben la IP al ver el mapa del hoyo', (_i, textos, ip, mapa) => {
    const texto = textos.privacy.section7.content;

    expect(texto).toMatch(ip);
    expect(texto).toMatch(mapa);
    for (const servidor of ['IGN', 'PNOA', 'ICGC', 'geoEuskadi', 'IDENA']) expect(texto).toContain(servidor);
  });
});

describe('contraseña (B-3)', () => {
  it.each([
    ['es', es, /forma segura \(hash\)/, /cifrada/i],
    ['en', en, /securely \(hashed\)/, /encrypted/i],
  ])('%s: se guarda con hash, no «cifrada»', (_i, textos, hash, cifrada) => {
    expect(textos.privacy.section2.content).toMatch(hash);
    expect(textos.privacy.section2.content).not.toMatch(cifrada);
  });
});

// Decisión de Agustín (20 oct 2026): la edad mínima es 16 años, la misma que
// declara la casilla del registro, y no se pide consentimiento paterno a los
// menores de 18
describe('edad mínima en los Términos', () => {
  it.each([
    ['es', es, /16 años/, /padres|tutores|consentimiento paterno|menor de 18/i],
    ['en', en, /\b16\b/, /parents|guardians|parental consent|under 18/i],
  ])('%s: 16 años, sin consentimiento paterno para menores de 18', (_i, textos, dieciseis, paterno) => {
    const t = texto(textos.terms);

    expect(t).toMatch(dieciseis);
    expect(t).not.toMatch(paterno);
  });
});

// Revisión: el almacenamiento local no guarda solo preferencias. Lo que guarda
// de verdad (AuthContext, loUltimoConocido, scoringOfflineQueue, golpesPerdidos,
// LocalStorageHole*Store, cachés del mapa y de la ubicación, i18n) y qué se
// borra al cerrar sesión (clearAuth y las salidas forzadas)
describe('almacenamiento local, descrito con exactitud', () => {
  const casos = [
    ['es', es, [/datos de tu usuario/i, /anotaciones pendientes de enviar/i, /mapa del hoyo/i, /ubicación de los campos/i, /reportes y muestras de hoyos/i, /idioma/i, /se borran al cerrar sesión/i, /no se borran al cerrar sesión/i, /no requiere\w* consentimiento/i], /para tus preferencias, como el idioma|para recordar preferencias/i],
    ['en', en, [/your user data/i, /scores waiting to be sent/i, /hole map/i, /location of courses/i, /hole reports and samples/i, /language/i, /deleted when you log out/i, /not deleted when you log out/i, /do not require consent|does not require consent/i], /for your preferences, such as the language|to remember preferences/i],
  ];

  it.each(casos)('%s: la Política de Privacidad (apartado 8)', (_i, textos, patrones, soloPreferencias) => {
    const texto = textos.privacy.section8.content;

    for (const patron of patrones) expect(texto).toMatch(patron);
    expect(texto).not.toMatch(soloPreferencias);
  });

  it.each(casos)('%s: la Política de Cookies (apartado 1)', (_i, textos, patrones, soloPreferencias) => {
    const texto = textos.cookies.section1.content;

    for (const patron of patrones) expect(texto).toMatch(patron);
    expect(texto).not.toMatch(soloPreferencias);
  });

  it.each([
    ['es', es, /guardamos tus preferencias \(idioma e interfaz\)/i],
    ['en', en, /we keep your preferences \(language and interface\)/i],
  ])('%s: el apartado 2 de Cookies no lo contradice', (_i, textos, viejo) => {
    expect(textos.cookies.section2.content).not.toMatch(viejo);
  });
});

describe('qué se borra al cerrar sesión, línea a línea', () => {
  // Una mutación demostró que buscarlo en todo el texto no basta: cambiar una
  // sola línea a «se borran» pasaba porque otras seguían diciendo «no se borran»
  const linea = (texto, patron) => texto.split('\n').find((l) => patron.test(l)) ?? '';

  it.each([
    ['es', es, /datos de tu usuario/i, /anotaciones pendientes de enviar/i, /^- .*Se borran al cerrar sesión/, /No se borran al cerrar sesión/],
    ['en', en, /your user data/i, /scores waiting to be sent/i, /(It is|They are) deleted when you log out/, /not deleted when you log out/],
  ])('%s: los datos del usuario se borran y las anotaciones pendientes no', (_i, textos, usuario, pendientes, seBorran, noSeBorran) => {
    for (const texto of [textos.privacy.section8.content, textos.cookies.section1.content]) {
      expect(linea(texto, usuario)).toMatch(seBorran);
      expect(linea(texto, usuario)).not.toMatch(noSeBorran);
      expect(linea(texto, pendientes)).toMatch(noSeBorran);
    }
  });
});

// CodeRabbit (PR #922): el Aviso Legal y el resumen de datos de la Privacidad
// daban a entender que la RFEG solo se consulta a petición del jugador. Los
// casos son los de `privacy.section4`
describe('cuándo se consulta la RFEG, igual en todos los textos', () => {
  it.each([
    ['es', es, [/a petición del jugador/i, /organizador/i, /cierr\w* (de )?las inscripciones/i, /capitanes/i, /España/, /personalizado/i], /solo a petición/i],
    ['en', en, [/at the player's request/i, /organiser/i, /enrolment closes/i, /captains/i, /Spain/, /custom handicap/i], /only (happens )?at/i],
  ])('%s: el Aviso Legal (objeto y fuente RFEG) da los mismos casos', (_i, textos, patrones, soloAPeticion) => {
    for (const texto of [textos.legalNotice.section2.content, textos.legalNotice.section6.sources.rfeg.detail]) {
      for (const patron of patrones) expect(texto).toMatch(patron);
      expect(texto).not.toMatch(soloAPeticion);
    }
  });

  it.each([
    ['es', es, /a tu petición o introducido a mano/i, /apartado 4/, /a mano/],
    ['en', en, /at your request or entered manually/i, /section 4/, /manually/],
  ])('%s: el resumen de datos de la Privacidad remite al apartado 4 y mantiene el hándicap a mano', (_i, textos, viejo, remite, aMano) => {
    const texto = textos.privacy.section2.content;

    expect(texto).not.toMatch(viejo);
    expect(texto).toMatch(remite);
    expect(texto).toMatch(aMano);
  });
});

// Decisión de Agustín (20 oct 2026): la prueba de aceptación de los Términos se
// cuenta en los datos que tratamos (2), en finalidades y bases (3) y en la
// conservación (9), sin contradecir el resto
describe('prueba de aceptación de los Términos', () => {
  const linea = (texto, patron) => texto.split('\n').find((l) => patron.test(l)) ?? '';

  it.each([
    ['es', es, /prueba de aceptación/i, [/versión/i, /fecha/i, /correo electrónico/i, /dirección IP/i, /navegador/i]],
    ['en', en, /proof of acceptance/i, [/version/i, /date/i, /email/i, /IP address/i, /browser/i]],
  ])('%s (2): qué se guarda al aceptar', (_i, textos, prueba, datos) => {
    const l = linea(textos.privacy.section2.content, prueba);

    for (const patron of datos) expect(l).toMatch(patron);
  });

  it.each([
    ['es', es, /prueba de aceptación/i, [/acreditar/i, /6\.1\.c/, /6\.1\.f/, /reclamaciones/i]],
    ['en', en, /proof of acceptance/i, [/prove/i, /6\.1\.c/, /6\.1\.f/, /claims/i]],
  ])('%s (3): para qué y con qué base', (_i, textos, prueba, patrones) => {
    const l = linea(textos.privacy.section3.content, prueba);

    for (const patron of patrones) expect(l).toMatch(patron);
  });

  it.each([
    ['es', es, /prueba de aceptación/i, /3 años después de su borrado/i, /se borra por completo(?!, salvo)/i],
    ['en', en, /proof of acceptance/i, /3 years after (it is|its) deleted|3 years after deletion/i, /deleted entirely(?!, except)/i],
  ])('%s (9): se conserva mientras exista la cuenta y 3 años después, sin contradecir el borrado completo', (_i, textos, prueba, plazo, contradiccion) => {
    const texto = textos.privacy.section9.content;

    expect(linea(texto, prueba)).toMatch(plazo);
    expect(texto).not.toMatch(contradiccion);
  });

  it.each([
    ['es', es, /prueba de aceptación/i, /correo electrónico/i],
    ['en', en, /proof of acceptance/i, /email/i],
  ])('%s (9): lo que se conserva tras el borrado incluye el email del momento de aceptar', (_i, textos, prueba, email) => {
    expect(linea(textos.privacy.section9.content, prueba)).toMatch(email);
  });
});

// Revisión a fondo de la release (20 oct 2026)
describe('revisión de la release', () => {
  const linea = (texto, patron) => texto.split('\n').find((l) => patron.test(l)) ?? '';

  // A2: la posición de la salida, cuando se confirma que se está en ella, viaja
  // como muestra anónima para mejorar los mapas (backend: golf_course_hole_samples,
  // sin usuario y solo con el día). Los reportes llevan puntos tocados en el
  // mapa, no la posición
  it.each([
    ['es', es, [/salida/i, /muestra/i, /sin ningún dato de quién/i, /solo el día/i, /reportes/i, /no tu posición/i], /para dos cosas/i],
    ['en', en, [/tee/i, /sample/i, /without any data on who/i, /only the day/i, /reports/i, /not your position/i], /for two things/i],
  ])('A2 (%s): la ubicación, con su tercer uso, en el apartado 5', (_i, textos, patrones, dosCosas) => {
    const texto = textos.privacy.section5.content;

    for (const patron of patrones) expect(texto).toMatch(patron);
    expect(texto).not.toMatch(dosCosas);
  });

  it.each([
    ['es', es, /mejorar los mapas/i, [/6\.1\.a/, /6\.1\.f/, /anónim/i]],
    ['en', en, /improve the maps/i, [/6\.1\.a/, /6\.1\.f/, /anonymous/i]],
  ])('A2 (%s): su base legal en el apartado 3', (_i, textos, uso, patrones) => {
    const l = linea(textos.privacy.section3.content, uso);

    for (const patron of patrones) expect(l).toMatch(patron);
  });

  it.each([
    ['es', es, /Ubicación/, /mapas/i],
    ['en', en, /Location/, /maps/i],
  ])('A2 (%s): y en los datos que tratamos (apartado 2)', (_i, textos, ubicacion, mapas) => {
    expect(linea(textos.privacy.section2.content, ubicacion)).toMatch(mapas);
  });

  // A3: la desactivación conserva todo y la supresión es manual: sin automatismos
  it.each([
    ['es', es, [/desactiv/i, /un mes/i, /manualmente/i, /se borra entera|se borra por completo/i, /3 años/i], /desactivamos tu cuenta (\([^)]*\) )?y suprimimos/i],
    ['en', en, [/deactivat/i, /one month/i, /manually/i, /deleted entirely/i, /3 years/i], /we deactivate (it|your account) (\([^)]*\) )?and erase/i],
  ])('A3 (%s): la baja dice lo que se hace, en Privacidad §9 y Términos §8', (_i, textos, patrones, automatico) => {
    for (const texto of [textos.privacy.section9.content, textos.terms.section8.content]) {
      for (const patron of patrones.slice(0, 3)) expect(texto).toMatch(patron);
      expect(texto).not.toMatch(automatico);
    }
    for (const patron of patrones.slice(3)) expect(textos.privacy.section9.content).toMatch(patron);
  });

  // A4: la RFEG no tiene licencia: se cita como fuente
  it.each([
    ['es', es, /conforme a sus licencias/i, /RFEG[^.]*fuente|fuente[^.]*RFEG/i],
    ['en', en, /under their licen[cs]es/i, /RFEG[^.]*source|source[^.]*RFEG/i],
  ])('A4 (%s): el Aviso Legal distingue las licencias de la cita de la RFEG', (_i, textos, licencias, fuente) => {
    const texto = textos.legalNotice.section4.content;
    const conLicencia = texto.split(/(?<=\.)\s/).find((f) => licencias.test(f)) ?? '';

    expect(texto).toMatch(fuente);
    expect(conLicencia).not.toMatch(/RFEG|campos|course data/i);
  });

  // B2: el formulario de contacto acaba como issue en GitHub
  it.each([
    ['es', es, /formulario de contacto/i, [/nombre/i, /correo|email/i, /mensaje/i], /GitHub/, /EE\. UU\./, /interés legítimo|consentimiento/i],
    ['en', en, /contact form/i, [/name/i, /email/i, /message/i], /GitHub/, /US/, /legitimate interest|consent/i],
  ])('B2 (%s): contacto en datos (§2), proveedores (§7) y base (§3)', (_i, textos, contacto, datos, github, eeuu, base) => {
    const enDatos = linea(textos.privacy.section2.content, contacto);
    for (const patron of datos) expect(enDatos).toMatch(patron);

    const enProveedores = linea(textos.privacy.section7.content, github);
    expect(enProveedores).toMatch(contacto);
    expect(enProveedores).toMatch(eeuu);

    expect(linea(textos.privacy.section3.content, contacto)).toMatch(base);
  });

  // Cookies §1: todas las claves de sessionStorage
  it.each([
    ['es', es, [/Google/, /arranque/i, /bucle/i, /recarg/i]],
    ['en', en, [/Google/, /start-up/i, /loop/i, /reload/i]],
  ])('Cookies (%s): la lista de sessionStorage está completa', (_i, textos, patrones) => {
    const l = linea(textos.cookies.section1.content, /sessionStorage,/);

    for (const patron of patrones) expect(l).toMatch(patron);
  });
});

describe('un solo nombre para los Términos', () => {
  const todos = (idioma) =>
    ['auth', 'common', 'legal', 'profile'].map((ns) => readFileSync(`src/i18n/locales/${idioma}/${ns}.json`, 'utf8')).join(' ');

  it.each([
    ['es', /Términos de Servicio/i, 'Términos y condiciones'],
    ['en', /Terms of Service/i, 'Terms and Conditions'],
  ])('%s: «%s» no aparece; el nombre es el de la casilla', (idioma, viejo, nuevo) => {
    const texto = todos(idioma);

    expect(texto).not.toMatch(viejo);
    expect(texto).toContain(nuevo);
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('%s: el título de los Términos usa ese nombre', (_i, textos) => {
    expect(textos.terms.title).toMatch(/Términos y condiciones|Terms and Conditions/);
  });
});
