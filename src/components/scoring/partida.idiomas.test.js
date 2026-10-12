import { describe, it, expect } from 'vitest';
import pagina from '../../pages/player/GroupScoringPage.jsx?raw';
import clasificacion from './Clasificacion.jsx?raw';
import tarjetas from './TarjetasDeLaPartida.jsx?raw';
import seccion from './ClasificacionesDeLaCompeticion.jsx?raw';
import errores from '../../utils/erroresDePartida.js?raw';
import es from '../../i18n/locales/es/scoring.json';
import en from '../../i18n/locales/en/scoring.json';

/**
 * Cada texto `partida.*` de anotar una partida existe en español y en inglés
 * (FE #824, PR 7), también los que se arman con un valor del servidor. Los
 * tests de los componentes sustituyen `t` por la clave: una que falta pasaría
 * desapercibida. Un plural vale con `_one` y `_other`.
 */
const codigo = [pagina, clasificacion, tarjetas, seccion, errores].join('\n');
const sueltas = [...new Set([...codigo.matchAll(/'(partida\.[a-zA-Z.]+[a-zA-Z])'/g)].map((m) => m[1]))];
const lista = (nombre) => [...codigo.match(new RegExp(`const ${nombre} = \\[([^\\]]*)\\]`))[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
const armadas = [
  ...['STABLEFORD', 'MEDAL'].map((c) => `partida.type.${c}`),
  ...['input', 'standings', 'cards'].map((c) => `partida.tabs.${c}`),
  ...['CLASIFICADO', 'SIN_EMPEZAR', 'NR', 'NP'].map((c) => `partida.status.${c}`),
  ...['ACCUMULATED', 'BEST_CARD'].map((c) => `partida.rule.${c}`),
  ...['SIN_EMPEZAR', 'NR', 'NP'].map((c) => `partida.statusShort.${c}`),
  ...['overall', 'scratch'].map((c) => `partida.${c}`),
  ...['JUGANDO', 'ENTREGADA', 'RETIRADO', 'NO_PRESENTADO'].map((c) => `partida.cardStatus.${c}`),
  ...lista('CODIGOS_DE_PARTIDA').map((c) => `partida.errors.${c}`),
  'partida.errors.SCORECARD_NOT_READY_holes',
];

const existe = (textos, ruta) => {
  const partes = ruta.split('.');
  const clave = partes.pop();
  const grupo = partes.reduce((g, p) => g?.[p], textos);
  return typeof grupo?.[clave] === 'string' || (typeof grupo?.[`${clave}_one`] === 'string' && typeof grupo?.[`${clave}_other`] === 'string');
};

describe('los textos de anotar una partida (FE #824, PR 7)', () => {
  it('lee de verdad el código', () => {
    expect(sueltas.length).toBeGreaterThan(30);
    expect(lista('CODIGOS_DE_PARTIDA')).toHaveLength(13);
  });

  it.each([
    ['español', es],
    ['inglés', en],
  ])('en %s están todas', (_idioma, textos) => {
    expect([...sueltas, ...armadas].filter((c) => !existe(textos, c))).toEqual([]);
  });
});
