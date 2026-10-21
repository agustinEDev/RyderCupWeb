import { describe, it, expect } from 'vitest';
import { CODIGOS_CON_JUGADORES, mensajeConJugadores } from './erroresConJugadores';
import es from '../i18n/locales/es/schedule.json';
import en from '../i18n/locales/en/schedule.json';

/**
 * Los errores del servidor que traen la lista de jugadores afectados: el texto
 * los nombra, como ya hacían la ficha y las partidas de la franja.
 *
 *   #   llega                                      | se devuelve
 *   ----|------------------------------------------|---------------------------------------
 *   J1  código con lista y nombres                 | `<prefijo>.<código>` con la cuenta de
 *                                                  | TODOS y los nombres separados por coma
 *   J2  código con lista, ninguno con nombre       | `<prefijo>.<código>_unnamed`
 *   J2  código sin `data` o sin `players`          | `<prefijo>.<código>_unnamed`
 *   J3  otro código, o ninguno                     | null: quien llama decide
 *   J3  código fuera de los que acepta quien llama | null
 */

const t = (clave, valores) => (valores ? `${clave}|${JSON.stringify(valores)}` : clave);
const error = (errorCode, players) => Object.assign(new Error('detalle genérico'), { errorCode, data: { players } });

describe('mensajeConJugadores', () => {
  it('conoce los tres códigos con lista', () => {
    expect(CODIGOS_CON_JUGADORES).toEqual([
      'PLAYERS_WITHOUT_TEE',
      'PLAYERS_WITHOUT_HANDICAP',
      'PLAYERS_WITHOUT_TEE_WINDOW',
    ]);
  });

  it.each(['PLAYERS_WITHOUT_TEE', 'PLAYERS_WITHOUT_HANDICAP', 'PLAYERS_WITHOUT_TEE_WINDOW'])(
    'J1: %s nombra a los jugadores y cuenta a todos, también al que viene sin nombre',
    (codigo) => {
      const e = error(codigo, [{ name: 'Ana' }, { name: '' }, { name: 'Luis' }]);
      expect(mensajeConJugadores(t, e, 'agenda.errors')).toBe(
        `agenda.errors.${codigo}|${JSON.stringify({ count: 3, jugadores: 'Ana, Luis' })}`
      );
    }
  );

  it('J2: sin ningún nombre, el texto sin hueco', () => {
    expect(mensajeConJugadores(t, error('PLAYERS_WITHOUT_TEE', [{ name: null }]), 'p')).toBe(
      'p.PLAYERS_WITHOUT_TEE_unnamed'
    );
  });

  it('J2: sin lista, el texto sin hueco', () => {
    const sinData = Object.assign(new Error('x'), { errorCode: 'PLAYERS_WITHOUT_HANDICAP' });
    expect(mensajeConJugadores(t, sinData, 'p')).toBe('p.PLAYERS_WITHOUT_HANDICAP_unnamed');
    expect(mensajeConJugadores(t, error('PLAYERS_WITHOUT_HANDICAP', undefined), 'p')).toBe(
      'p.PLAYERS_WITHOUT_HANDICAP_unnamed'
    );
  });

  it('J3: otro código, ninguno o ningún error: null', () => {
    expect(mensajeConJugadores(t, error('GROUP_FULL', [{ name: 'Ana' }]), 'p')).toBeNull();
    expect(mensajeConJugadores(t, new Error('x'), 'p')).toBeNull();
    expect(mensajeConJugadores(t, undefined, 'p')).toBeNull();
  });

  it('J3: un código que quien llama no acepta: null', () => {
    const e = error('PLAYERS_WITHOUT_TEE_WINDOW', [{ name: 'Ana' }]);
    expect(mensajeConJugadores(t, e, 'p', ['PLAYERS_WITHOUT_TEE'])).toBeNull();
  });
});

// La agenda y las franjas los piden en `agenda.errors`: los tres, en los dos
// idiomas, con su plural y su versión sin nombres
describe('textos de agenda.errors', () => {
  it.each([
    ['es', es],
    ['en', en],
  ])('en %s están todos', (_idioma, textos) => {
    const faltan = CODIGOS_CON_JUGADORES.flatMap((c) => [`${c}_one`, `${c}_other`, `${c}_unnamed`]).filter(
      (clave) => typeof textos.agenda?.errors?.[clave] !== 'string'
    );
    expect(faltan).toEqual([]);
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('en %s, los que nombran llevan el hueco de los nombres', (_idioma, textos) => {
    for (const c of CODIGOS_CON_JUGADORES) {
      expect(textos.agenda.errors[`${c}_one`]).toContain('{{jugadores}}');
      expect(textos.agenda.errors[`${c}_other`]).toContain('{{jugadores}}');
      expect(textos.agenda.errors[`${c}_other`]).toContain('{{count}}');
    }
  });
});
