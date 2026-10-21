import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import matchCard from './MatchCard.jsx?raw';
import matchDetail from './MatchDetailModal.jsx?raw';
import assignTeams from './AssignTeamsModal.jsx?raw';
import generateMatches from './GenerateMatchesModal.jsx?raw';
import teamAssignment from './TeamAssignmentSection.jsx?raw';
import es from '../../i18n/locales/es/schedule.json';
import en from '../../i18n/locales/en/schedule.json';

/**
 * Las abreviaturas del hándicap en el calendario —«HCP» del índice, «PH» del
 * de juego y «Lim.» del tope— pasan por `t()` (revisión del 21 oct), como todo
 * texto visible. Se quedan IGUALES en los dos idiomas: Agustín decidió mantener
 * «HCP», así que solo cambia de dónde salen, no lo que se lee.
 *
 *   #   comprobación                                         | esperado
 *   ----|----------------------------------------------------|---------------------------
 *   E1  ningún componente las escribe a mano                  | ni «HCP», ni «PH:», ni «Lim.»
 *   E2  cada clave `handicapLabels.*` usada existe en es y en | todas
 *   E3  con el i18next de verdad, se leen como antes          | «HCP +2.0», «PH: 18 Lim.»…
 */
const componentes = { matchCard, matchDetail, assignTeams, generateMatches, teamAssignment };
const codigo = Object.values(componentes).join('\n');
const usadas = [...new Set([...codigo.matchAll(/'handicapLabels\.([a-zA-Z]+)'/g)].map((m) => m[1]))];

// Sin comentarios: ahí sí se puede nombrar «HCP»
const sinComentarios = (fuente) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const traductor = async (lng) => {
  const i = i18next.createInstance();
  await i.init({
    lng,
    resources: { es: { schedule: es }, en: { schedule: en } },
    defaultNS: 'schedule',
    interpolation: { escapeValue: false },
  });
  return i.t.bind(i);
};

describe('las abreviaturas del hándicap del calendario', () => {
  it.each(Object.entries(componentes))('E1: %s no las escribe a mano', (_nombre, fuente) => {
    const limpio = sinComentarios(fuente);
    expect(limpio).not.toMatch(/\bHCP\b/);
    expect(limpio).not.toMatch(/\bPH:/);
    expect(limpio).not.toMatch(/\bLim\./);
  });

  it('E2: lee de verdad el código, y todas las claves están en los dos idiomas', () => {
    expect(usadas.sort()).toEqual(['index', 'indexWithColon', 'limit', 'playing', 'playingCapped']);
    for (const [idioma, textos] of [['es', es], ['en', en]]) {
      const faltan = usadas.filter((c) => typeof textos.handicapLabels?.[c] !== 'string');
      expect(faltan, idioma).toEqual([]);
    }
  });

  it.each(['es', 'en'])('E3: en %s se leen como antes', async (idioma) => {
    const t = await traductor(idioma);

    expect(t('handicapLabels.index', { value: '+2.0' })).toBe('HCP +2.0');
    expect(t('handicapLabels.indexWithColon', { value: '12.4' })).toBe('HCP: 12.4');
    expect(t('handicapLabels.playing', { value: '18' })).toBe('PH: 18');
    expect(t('handicapLabels.playingCapped', { value: '+2' })).toBe('PH: +2 Lim.');
    expect(t('handicapLabels.limit', { value: 18 })).toBe('18 Lim.');
  });
});
