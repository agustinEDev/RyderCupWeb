import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
