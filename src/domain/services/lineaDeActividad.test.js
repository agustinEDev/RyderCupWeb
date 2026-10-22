import { describe, it, expect } from 'vitest';
import {
  armaLaLineaDeActividad,
  haceCuanto,
  primerasTarjetasPorDia,
  queDiaEs,
  textoDeLaInsignia,
} from './lineaDeActividad';

// Jueves 22 de octubre de 2026, 18:00 en hora local: la semana empieza el
// lunes 19, ayer es el miércoles 21
const AHORA = new Date(2026, 9, 22, 18, 0);

const evento = (overrides = {}) => ({
  id: 'e1',
  userId: 'u1',
  type: 'BIRDIE',
  occurredAt: new Date(2026, 9, 22, 12, 0),
  publishedAt: new Date(2026, 9, 22, 17, 0),
  payload: {},
  sourceMatchId: 'm1',
  groupKey: 'u1:m1',
  ...overrides,
});

const solicitud = (overrides = {}) => ({
  friendshipId: 'f1',
  requesterId: 'u9',
  createdAt: new Date(2026, 9, 22, 16, 0),
  ...overrides,
});

const tarjetasDe = (linea) => linea.dias.flatMap((dia) => dia.tarjetas);

describe('textoDeLaInsignia (case 1)', () => {
  it.each([
    [0, ''],
    [-1, ''],
    [null, ''],
    [undefined, ''],
    [Number.NaN, ''],
    [1, '1'],
    [5, '5'],
    [9, '9'],
    [10, '9+'],
    [42, '9+'],
  ])('%s -> %j', (n, texto) => {
    expect(textoDeLaInsignia(n)).toBe(texto);
  });
});

describe('armaLaLineaDeActividad', () => {
  it('orders the cards newest first by publication, not by when it was played (case 5)', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'viejo', groupKey: 'g-viejo', publishedAt: new Date(2026, 9, 22, 9, 0) }),
        evento({
          id: 'nuevo',
          groupKey: 'g-nuevo',
          // Jugado antes, publicado después: manda la publicación
          occurredAt: new Date(2026, 9, 1, 12, 0),
          publishedAt: new Date(2026, 9, 22, 17, 30),
        }),
      ],
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.clave)).toEqual(['g-nuevo', 'g-viejo']);
  });

  it('falls back to when it was played if the publication date is missing', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'a', groupKey: 'ga', publishedAt: null, occurredAt: new Date(2026, 9, 20, 12) }),
        evento({ id: 'b', groupKey: 'gb', publishedAt: new Date(2026, 9, 21, 12) }),
      ],
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.clave)).toEqual(['gb', 'ga']);
    expect(tarjetasDe(linea)[1].instante).toEqual(new Date(2026, 9, 20, 12));
  });

  it('groups the achievements of one round into one card, keeping all of them (case 9)', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'b', type: 'BIRDIE', groupKey: 'u1:m1', payload: { count: 3 } }),
        evento({ id: 'e', type: 'EAGLE_OR_BETTER', groupKey: 'u1:m1' }),
        evento({ id: 'n', type: 'NEW_COURSE', groupKey: 'u1:m1' }),
        evento({ id: 'otro', type: 'BIRDIE', groupKey: 'u2:m1', userId: 'u2' }),
      ],
      ahora: AHORA,
    });

    const tarjetas = tarjetasDe(linea);
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0].eventos.map((e) => e.id)).toEqual(['b', 'e', 'n']);
    expect(tarjetas[0].autorId).toBe('u1');
    expect(tarjetas[1].eventos.map((e) => e.id)).toEqual(['otro']);
  });

  it('groups across pages: a round split by the cursor is still one card', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'a', groupKey: 'g1' }),
        evento({ id: 'x', groupKey: 'g2', publishedAt: new Date(2026, 9, 22, 16) }),
        evento({ id: 'b', groupKey: 'g1', type: 'EAGLE_OR_BETTER' }),
      ],
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.eventos.map((e) => e.id))).toEqual([['a', 'b'], ['x']]);
  });

  it('gives each event its own card when it has no group key', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [evento({ id: 'a', groupKey: null }), evento({ id: 'b', groupKey: undefined })],
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.clave)).toEqual(['a', 'b']);
  });

  it('ignores event types it does not know (forward compatibility)', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'raro', type: 'SOMETHING_FROM_THE_FUTURE', groupKey: 'g-raro' }),
        evento({ id: 'ok', type: 'QUICK_MATCH_FINISHED', groupKey: 'g-ok' }),
      ],
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.clave)).toEqual(['g-ok']);
  });

  it.each([
    'HOLE_IN_ONE',
    'EAGLE_OR_BETTER',
    'BIRDIE',
    'NEW_COURSE',
    'PERSONAL_BEST',
    'FIRST_TOURNAMENT',
    'ENROLLMENT_APPROVED',
    'INVITED_TO_TOURNAMENT',
    'ENROLLMENT_REQUEST_CLOSED',
    'ENROLLMENT_REJECTED',
    'ENROLLED_IN_TOURNAMENT',
    'TOURNAMENT_MATCH_RESULT',
    'TOURNAMENT_FINAL_STANDING',
    'QUICK_MATCH_FINISHED',
  ])('keeps the known type %s', (type) => {
    const linea = armaLaLineaDeActividad({ eventos: [evento({ type })], ahora: AHORA });

    expect(tarjetasDe(linea)).toHaveLength(1);
  });

  it('splits the cards by local day, newest day first (case 6)', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'hoy', groupKey: 'hoy', publishedAt: new Date(2026, 9, 22, 0, 5) }),
        evento({ id: 'ayer1', groupKey: 'ayer1', publishedAt: new Date(2026, 9, 21, 23, 55) }),
        evento({ id: 'ayer2', groupKey: 'ayer2', publishedAt: new Date(2026, 9, 21, 8, 0) }),
        evento({ id: 'lunes', groupKey: 'lunes', publishedAt: new Date(2026, 9, 19, 10, 0) }),
      ],
      ahora: AHORA,
    });

    expect(linea.dias.map((d) => d.tarjetas.map((t) => t.clave))).toEqual([
      ['hoy'],
      ['ayer1', 'ayer2'],
      ['lunes'],
    ]);
    expect(linea.dias.map((d) => d.fecha)).toEqual([
      new Date(2026, 9, 22),
      new Date(2026, 9, 21),
      new Date(2026, 9, 19),
    ]);
  });

  it('marks as new the first ones since the last visit, requests included (case 7)', () => {
    // 3 novedades: la solicitud de las 16:00 y las dos tarjetas más recientes
    // que ella (17:00 y 16:30). La de las 15:00 ya se había visto
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'a', groupKey: 'a', publishedAt: new Date(2026, 9, 22, 17, 0) }),
        evento({ id: 'b', groupKey: 'b', publishedAt: new Date(2026, 9, 22, 16, 30) }),
        evento({ id: 'c', groupKey: 'c', publishedAt: new Date(2026, 9, 22, 15, 0) }),
      ],
      solicitudes: [
        solicitud({ friendshipId: 'f-nueva', createdAt: new Date(2026, 9, 22, 16, 0) }),
        solicitud({ friendshipId: 'f-vieja', createdAt: new Date(2026, 9, 20, 9, 0) }),
      ],
      novedades: 3,
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => [t.clave, t.nueva])).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
    ]);
    expect(linea.solicitudes.map((s) => [s.friendshipId, s.nueva])).toEqual([
      ['f-nueva', true],
      ['f-vieja', false],
    ]);
  });

  it('marks nothing as new when there is nothing unseen', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [evento()],
      solicitudes: [solicitud()],
      novedades: 0,
      ahora: AHORA,
    });

    expect(tarjetasDe(linea)[0].nueva).toBe(false);
    expect(linea.solicitudes[0].nueva).toBe(false);
  });

  it('counts a grouped card once when marking new', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [
        evento({ id: 'a1', groupKey: 'g1', publishedAt: new Date(2026, 9, 22, 17) }),
        evento({ id: 'a2', groupKey: 'g1', publishedAt: new Date(2026, 9, 22, 17) }),
        evento({ id: 'b', groupKey: 'g2', publishedAt: new Date(2026, 9, 22, 16) }),
      ],
      novedades: 2,
      ahora: AHORA,
    });

    expect(tarjetasDe(linea).map((t) => t.nueva)).toEqual([true, true]);
  });

  it('keeps the requests on top, newest first', () => {
    const linea = armaLaLineaDeActividad({
      eventos: [],
      solicitudes: [
        solicitud({ friendshipId: 'vieja', createdAt: new Date(2026, 9, 1) }),
        solicitud({ friendshipId: 'nueva', createdAt: new Date(2026, 9, 21) }),
      ],
      ahora: AHORA,
    });

    expect(linea.solicitudes.map((s) => s.friendshipId)).toEqual(['nueva', 'vieja']);
    expect(linea.dias).toEqual([]);
  });

  it('copes with no input at all', () => {
    expect(armaLaLineaDeActividad({ ahora: AHORA })).toEqual({ solicitudes: [], dias: [] });
  });
});

describe('queDiaEs (case 6)', () => {
  it.each([
    [new Date(2026, 9, 22, 0, 0), 'hoy'],
    [new Date(2026, 9, 22, 23, 59), 'hoy'],
    [new Date(2026, 9, 21, 23, 59), 'ayer'],
    [new Date(2026, 9, 21, 0, 0), 'ayer'],
    [new Date(2026, 9, 20, 12, 0), 'semana'],
    [new Date(2026, 9, 19, 0, 0), 'semana'],
    // El domingo 18 es de la semana pasada
    [new Date(2026, 9, 18, 23, 59), 'esteAno'],
    [new Date(2026, 0, 1, 12, 0), 'esteAno'],
    [new Date(2025, 11, 31, 12, 0), 'otroAno'],
  ])('%s -> %s', (fecha, dia) => {
    expect(queDiaEs(fecha, AHORA)).toBe(dia);
  });

  it('on a Monday, yesterday is «yesterday» and the Saturday is last week', () => {
    const lunes = new Date(2026, 9, 19, 9, 0);

    expect(queDiaEs(new Date(2026, 9, 18, 12), lunes)).toBe('ayer');
    expect(queDiaEs(new Date(2026, 9, 17, 12), lunes)).toBe('esteAno');
  });

  it('on a Sunday, the Monday before is still this week', () => {
    const domingo = new Date(2026, 9, 25, 9, 0);

    expect(queDiaEs(new Date(2026, 9, 19, 12), domingo)).toBe('semana');
  });
});

describe('haceCuanto (case 8)', () => {
  it.each([
    [new Date(2026, 9, 22, 17, 59, 30), { unidad: 'ahora' }],
    [new Date(2026, 9, 22, 17, 59, 0), { unidad: 'minutos', valor: 1 }],
    [new Date(2026, 9, 22, 17, 55), { unidad: 'minutos', valor: 5 }],
    [new Date(2026, 9, 22, 17, 0, 1), { unidad: 'minutos', valor: 59 }],
    [new Date(2026, 9, 22, 17, 0), { unidad: 'horas', valor: 1 }],
    [new Date(2026, 9, 22, 15, 30), { unidad: 'horas', valor: 2 }],
    [new Date(2026, 9, 22, 0, 0), { unidad: 'horas', valor: 18 }],
    [new Date(2026, 9, 21, 23, 59), { unidad: 'hora' }],
    [new Date(2026, 8, 1, 10, 0), { unidad: 'hora' }],
    // Un reloj adelantado no da «hace -3 min»
    [new Date(2026, 9, 22, 18, 3), { unidad: 'ahora' }],
  ])('%s -> %j', (fecha, esperado) => {
    expect(haceCuanto(fecha, AHORA)).toEqual(esperado);
  });
});

// El perfil enseña la actividad de 5 en 5 tarjetas, con los días de Actividad
describe('primerasTarjetasPorDia', () => {
  const dia = (clave, n) => ({
    clave,
    fecha: new Date(2026, 9, 22),
    tarjetas: Array.from({ length: n }, (_, i) => ({ clave: `${clave}-${i}` })),
  });
  const forma = (dias) => dias.map((d) => [d.clave, d.tarjetas.length]);

  it.each([
    [0, []],
    [2, [['a', 2]]],
    [3, [['a', 3]]],
    [4, [['a', 3], ['b', 1]]],
    [6, [['a', 3], ['b', 2], ['c', 1]]],
    [99, [['a', 3], ['b', 2], ['c', 1]]],
  ])('the first %i cards keep their days and drop the empty ones', (n, esperado) => {
    expect(forma(primerasTarjetasPorDia([dia('a', 3), dia('b', 2), dia('c', 1)], n))).toEqual(
      esperado
    );
  });

  it('keeps the order of the cards inside a day cut in half', () => {
    const [a] = primerasTarjetasPorDia([dia('a', 3)], 2);
    expect(a.tarjetas.map((t) => t.clave)).toEqual(['a-0', 'a-1']);
    expect(a.fecha).toEqual(new Date(2026, 9, 22));
  });

  it('does not touch the days it receives', () => {
    const dias = [dia('a', 3)];
    primerasTarjetasPorDia(dias, 1);
    expect(dias[0].tarjetas).toHaveLength(3);
  });
});

describe('the new notices are known types (social decisions, case 1)', () => {
  it.each(['ENROLLMENT_CONFIRMED', 'TEE_TIME_ASSIGNED'])('%s gets its own card', (type) => {
    const { dias } = armaLaLineaDeActividad({
      eventos: [evento({ id: 'n1', type, groupKey: null }), evento({ id: 'n2', type, groupKey: null })],
      ahora: AHORA,
    });

    expect(dias.flatMap((d) => d.tarjetas).map((t) => t.tipo)).toEqual([type, type]);
  });
});

describe('the badge text with the real count up to 99 (social decisions, case 5)', () => {
  it.each([
    [10, '9+'],
    [99, '9+'],
  ])('%s -> %j', (n, texto) => {
    expect(textoDeLaInsignia(n)).toBe(texto);
  });

  it('marks up to 99 cards as new, not just 10', () => {
    const eventos = Array.from({ length: 30 }, (_, i) =>
      evento({ id: `e${i}`, groupKey: null, publishedAt: new Date(2026, 9, 22, 17, 59 - i) })
    );
    const { dias } = armaLaLineaDeActividad({ eventos, novedades: 25, ahora: AHORA });

    expect(dias.flatMap((d) => d.tarjetas).filter((t) => t.nueva)).toHaveLength(25);
  });
});
