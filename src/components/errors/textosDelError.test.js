import { describe, it, expect, vi, afterEach } from 'vitest';
import { idiomaDelError, textosDelError } from './textosDelError';

/**
 * El idioma de las pantallas de error (25 oct 2026). Sus textos van en el
 * propio código: los JSON de traducción se cargan bajo demanda y, justo cuando
 * falla la carga, pueden no estar.
 *
 *   #   caso                                            | idioma
 *   ----|------------------------------------------------|-------
 *   E1  guardado «es» o «es-ES»                         | es
 *   E1b guardado «en»                                   | en
 *   E1c sin guardar, navegador «es-ES»                  | es
 *   E1d sin guardar, navegador «fr-FR»                  | en (el de por defecto)
 *   E2  leer el almacenamiento lanza (Safari bloqueado) | el del navegador
 *   E3  textos en español y en inglés, los mismos campos | —
 *   E5  el de i18next en memoria manda (Safari sin almacenamiento) | ese
 *   E6  el navegador, por su lista de idiomas, como i18next | el primero
 */
const almacen = (valor) => ({ getItem: vi.fn(() => valor) });
const navegador = (language, languages) => ({ language, languages });
const sinI18n = { i18n: null };

describe('idiomaDelError', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(['es', 'es-ES'])('E1: guardado «%s» → español', (guardado) => {
    expect(idiomaDelError({ ...sinI18n, almacen: almacen(guardado), navegador: navegador('en-US') })).toBe('es');
  });

  it('E1b: guardado «en» → inglés, aunque el navegador diga español', () => {
    expect(idiomaDelError({ ...sinI18n, almacen: almacen('en'), navegador: navegador('es-ES') })).toBe('en');
  });

  it('E1c: sin guardar, el del navegador', () => {
    expect(idiomaDelError({ ...sinI18n, almacen: almacen(null), navegador: navegador('es-ES') })).toBe('es');
  });

  it('E1d: otro idioma → inglés, el de por defecto de la app', () => {
    expect(idiomaDelError({ ...sinI18n, almacen: almacen(null), navegador: navegador('fr-FR') })).toBe('en');
  });

  it('E2: si leer el almacenamiento lanza, el del navegador', () => {
    const roto = { getItem: () => { throw new Error('SecurityError'); } };
    expect(idiomaDelError({ ...sinI18n, almacen: roto, navegador: navegador('es-ES') })).toBe('es');
  });

  it('E2b: con lo de verdad (localStorage del navegador)', () => {
    vi.stubGlobal('localStorage', almacen('es'));
    expect(idiomaDelError({ ...sinI18n })).toBe('es');
  });

  it('E5: el idioma que i18next tiene en memoria manda', () => {
    const roto = { getItem: () => { throw new Error('SecurityError'); } };
    expect(idiomaDelError({ i18n: { resolvedLanguage: 'es' }, almacen: roto, navegador: navegador('en-US') })).toBe('es');
    expect(idiomaDelError({ i18n: { language: 'en' }, almacen: almacen('es'), navegador: navegador('es-ES') })).toBe('en');
  });

  it('E6: del navegador, el primero de su lista, como i18next', () => {
    expect(idiomaDelError({ ...sinI18n, almacen: almacen(null), navegador: navegador('en-US', ['es-ES', 'en-US']) })).toBe('es');
  });
});

describe('textosDelError', () => {
  it('E3: español e inglés traen los mismos campos, ninguno vacío', () => {
    const { idioma: idiomaEs, ...es } = textosDelError('es');
    const { idioma: idiomaEn, ...en } = textosDelError('en');
    expect([idiomaEs, idiomaEn]).toEqual(['es', 'en']);
    const campos = (textos) => Object.entries(textos).flatMap(([pantalla, t]) => Object.keys(t).map((k) => `${pantalla}.${k}`)).sort();
    expect(campos(es)).toEqual(campos(en));
    for (const textos of [es, en]) {
      for (const pantalla of Object.values(textos)) {
        for (const valor of Object.values(pantalla)) expect(valor).toMatch(/\S/);
      }
    }
    expect(es.sinCargar.titulo).toBe('No se ha podido cargar la aplicación');
    expect(es.fallo.boton).toBe('Reintentar');
  });
});
