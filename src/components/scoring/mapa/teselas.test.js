import { describe, it, expect, vi } from 'vitest';
import es from '../../../i18n/locales/es/scoring.json';
import en from '../../../i18n/locales/en/scoring.json';

const sentry = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock('../../../utils/sentryHelpers', () => sentry);

const { ORTOFOTOS, atribucionDeLaOrtofoto, ponerOrtofoto } = await import('./teselas');
const { limitesDeLaComunidad } = await import('../../../domain/services/comunidadDelCampo');
const { CONTORNOS } = await import('../../../domain/services/contornosDeComunidades');

// Un mapa con las capas que tiene ya cargado: fondo, PNOA y lo de encima
const mapaFalso = (capas = ['fondo', 'pnoa', 'linea']) => {
  const fuentes = {};
  const lista = capas.map((id) => ({ id }));
  return {
    fuentes,
    lista,
    getStyle: () => ({ layers: lista }),
    getSource: (id) => fuentes[id],
    getLayer: (id) => lista.find((c) => c.id === id),
    addSource: vi.fn((id, f) => { fuentes[id] = f; }),
    removeSource: vi.fn((id) => { delete fuentes[id]; }),
    addLayer: vi.fn((capa, antes) => {
      const i = antes ? lista.findIndex((c) => c.id === antes) : lista.length;
      lista.splice(i, 0, capa);
    }),
    removeLayer: vi.fn((id) => { lista.splice(lista.findIndex((c) => c.id === id), 1); }),
  };
};

describe('ORTOFOTOS (19 oct)', () => {
  it.each([
    ['ES-CT', 'geoserveis.icgc.cat', 'ICGC'],
    ['ES-PV', 'www.geo.euskadi.eus', 'Gobierno Vasco'],
    ['ES-NC', 'idena.navarra.es', 'Gobierno de Navarra'],
  ])('%s: sus teselas y quién la firma, en español y en inglés (/code-review: por t())', (codigo, servidor, firma) => {
    const ortofoto = ORTOFOTOS[codigo];

    expect(new globalThis.URL(ortofoto.tiles[0].replace(/[{}]/g, '')).host).toBe(servidor);
    const clave = atribucionDeLaOrtofoto(codigo);
    expect(clave).toBe(`mapa.ortofoto.${codigo}`);
    expect(es.mapa.ortofoto[codigo]).toContain(firma);
    expect(en.mapa.ortofoto[codigo]).toBeTruthy();
  });

  it('Madrid, con la PNOA: su 2025 se ve peor que la PNOA (19 oct)', () => {
    expect(ORTOFOTOS['ES-MD']).toBeUndefined();
    expect(es.mapa.ortofoto['ES-MD']).toBeUndefined();
    expect(en.mapa.ortofoto['ES-MD']).toBeUndefined();
  });

  it('/code-review: las comunidades con contorno son las de ortofoto (ni contorno que no pinte nada, ni ortofoto sin contorno)', () => {
    expect(Object.keys(CONTORNOS).sort()).toEqual(Object.keys(ORTOFOTOS).sort());
    expect(Object.keys(es.mapa.ortofoto).sort()).toEqual(Object.keys(ORTOFOTOS).sort());
    expect(Object.keys(en.mapa.ortofoto).sort()).toEqual(Object.keys(ORTOFOTOS).sort());
  });

  it('sin ortofoto de comunidad, sin atribución', () => {
    expect(atribucionDeLaOrtofoto(null)).toBeNull();
    expect(atribucionDeLaOrtofoto('ES-AN')).toBeNull();
  });

  it('revisor: Navarra y Cataluña, transparentes fuera de su comunidad (en JPEG llegaban en blanco y tapaban la PNOA)', () => {
    // El mixto de IDENA: JPEG dentro, PNG transparente fuera
    expect(ORTOFOTOS['ES-NC'].tiles[0]).toContain('FORMAT=image/vnd.jpeg-png');
    expect(ORTOFOTOS['ES-NC'].tiles[0]).toContain('TRANSPARENT=TRUE');
    // Cataluña, igual (CodeRabbit): su XYZ en JPEG rellenaba fuera con otra imagen
    expect(ORTOFOTOS['ES-CT'].tiles[0]).toContain('LAYERS=ortofoto_color_vigent');
    expect(ORTOFOTOS['ES-CT'].tiles[0]).toContain('FORMAT=image/vnd.jpeg-png');
  });

  it('las de WMS piden la tesela en 3857 por su caja', () => {
    expect(ORTOFOTOS['ES-NC'].tiles[0]).toContain('BBOX={bbox-epsg-3857}');
    expect(ORTOFOTOS['ES-NC'].tiles[0]).toContain('CRS=EPSG:3857');
  });
});

describe('ponerOrtofoto', () => {
  it('O1/O8: la de la comunidad, encima de la PNOA y debajo de lo demás, solo dentro de su caja', () => {
    const mapa = mapaFalso();

    ponerOrtofoto(mapa, 'ES-CT');

    expect(mapa.fuentes.ortofoto).toEqual({
      type: 'raster',
      tiles: ORTOFOTOS['ES-CT'].tiles,
      tileSize: 256,
      maxzoom: 19,
      bounds: limitesDeLaComunidad('ES-CT'),
    });
    expect(mapa.lista.map((c) => c.id)).toEqual(['fondo', 'pnoa', 'ortofoto', 'linea']);
  });

  it('con el mapa aún sin nada encima de la PNOA, va justo detrás', () => {
    const mapa = mapaFalso(['fondo', 'pnoa']);

    ponerOrtofoto(mapa, 'ES-NC');

    expect(mapa.lista.map((c) => c.id)).toEqual(['fondo', 'pnoa', 'ortofoto']);
  });

  it('O5: sin comunidad, nada; y si había una, se quita', () => {
    const mapa = mapaFalso();
    sentry.captureError.mockClear();
    ponerOrtofoto(mapa, null);
    expect(mapa.addSource).not.toHaveBeenCalled();
    // Sin comunidad no hay nada que fallar
    expect(sentry.captureError).not.toHaveBeenCalled();

    ponerOrtofoto(mapa, 'ES-CT');
    ponerOrtofoto(mapa, null);

    expect(mapa.fuentes.ortofoto).toBeUndefined();
    expect(mapa.lista.map((c) => c.id)).toEqual(['fondo', 'pnoa', 'linea']);
  });

  it('/code-review: si MapLibre falla al ponerla, no rompe el mapa (se apunta y sigue)', () => {
    const mapa = mapaFalso();
    mapa.addSource = vi.fn(() => { throw new Error('bounds'); });

    expect(() => ponerOrtofoto(mapa, 'ES-CT')).not.toThrow();
    expect(sentry.captureError).toHaveBeenCalledWith(expect.any(Error), { tags: { modulo: 'mapa-de-hoyos' } });
  });

  it('/code-review: la misma recién puesta no se rehace aunque MapLibre aún no diga sus teselas', () => {
    const mapa = mapaFalso();
    ponerOrtofoto(mapa, 'ES-CT');
    // La fuente de verdad de MapLibre rellena `tiles` un fotograma después
    mapa.getSource = (id) => (mapa.fuentes[id] ? {} : undefined);

    ponerOrtofoto(mapa, 'ES-CT');

    expect(mapa.addSource).toHaveBeenCalledTimes(1);
    expect(mapa.removeSource).not.toHaveBeenCalled();
  });

  it('la misma otra vez no la rehace; otra distinta la cambia', () => {
    const mapa = mapaFalso();
    ponerOrtofoto(mapa, 'ES-CT');
    ponerOrtofoto(mapa, 'ES-CT');
    expect(mapa.addSource).toHaveBeenCalledTimes(1);

    ponerOrtofoto(mapa, 'ES-PV');

    expect(mapa.fuentes.ortofoto.tiles).toEqual(ORTOFOTOS['ES-PV'].tiles);
    expect(mapa.lista.filter((c) => c.id === 'ortofoto')).toHaveLength(1);
  });
});
