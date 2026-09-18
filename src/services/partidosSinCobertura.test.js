import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  horaDelCampo,
  partidosDelProximoDia,
  precargaElProximoDia,
  leeLosProximosPartidos,
  sePuedeAnotar,
  olvidaLasPrecargas,
} from './partidosSinCobertura';
import { loQueSeSupo, recuerda, recuerdaLosPartidos, losUltimosPartidos, olvidaTodo } from './loUltimoConocido';

/**
 * LA TABLA — llegar al campo con el partido ya en el móvil (FE #615).
 *
 *   #   caso                                          | qué pasa
 *   ----|---------------------------------------------|-------------------------------
 *   1   con red, llega la lista                       | se guarda, y se precarga la
 *       |                                             | vista del próximo día con partidos
 *   1b  la noche antes                                | el próximo día es mañana
 *   1c  tres partidos ese día                         | se precargan dos
 *   1d  una vista de un partido que no juego          | no se guarda
 *   2   sin red, con lista guardada                   | se enseña lo guardado, avisando
 *   2b  lo guardado trae partidos de días pasados     | esos no salen
 *   3   sin red, programado y de hoy                  | se puede anotar
 *   3b  con red, programado                           | no
 *   3c  sin red, programado pero de mañana            | no
 *   4   sin red y nada guardado                       | «no se pudo preguntar», no «no hay»
 *   5   media lista                                   | se enseña, pero no se guarda
 *   5b  media lista y vacía                           | como si no hubiera respondido
 *   7   la vista responde 404 o 403                   | se olvida lo que hubiera
 *   7a  la vista falla por red                        | lo guardado sigue
 *   7b  la lista responde 401 o 403                   | no se enseña lo guardado
 *   8   no cabe                                       | calla, y la cola ni se toca
 *   9   se abre el panel otra vez al rato             | no se vuelve a pedir la vista
 *   9b  la vez anterior falló por red                 | se vuelve a intentar
 */
const HOY = new Date(2026, 8, 17, 9, 0);
const USUARIO = 'u-1';

const partido = (id, roundDate = '2026-09-17', extra = {}) => ({
  id,
  roundDate,
  status: 'SCHEDULED',
  sessionType: 'MORNING',
  ...extra,
});

const vistaDe = (id, jugadores = [USUARIO]) => ({
  matchId: id,
  players: jugadores.map((userId) => ({ userId })),
  holes: [{ holeNumber: 1 }],
});

const conEstado = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

const almacen = new Map();

// Deja que termine lo que se lanzó sin esperar
const asienta = () => new Promise((r) => setTimeout(r, 0));

describe('partidosSinCobertura', () => {
  beforeEach(() => {
    almacen.clear();
    globalThis.localStorage = {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
    };
    olvidaTodo();
    olvidaLasPrecargas();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('qué se precarga', () => {
    it('los de hoy, si hoy hay partido', () => {
      const lista = [partido('hoy'), partido('manana', '2026-09-18')];

      expect(partidosDelProximoDia(lista, HOY).map((p) => p.id)).toEqual(['hoy']);
    });

    it('la noche antes, los de mañana', () => {
      const noche = new Date(2026, 8, 16, 23, 0);
      const lista = [partido('ayer', '2026-09-15'), partido('manana', '2026-09-17'), partido('luego', '2026-09-20')];

      expect(partidosDelProximoDia(lista, noche).map((p) => p.id)).toEqual(['manana']);
    });

    it('como mucho dos', () => {
      const lista = [partido('a'), partido('b'), partido('c')];

      expect(partidosDelProximoDia(lista, HOY)).toHaveLength(2);
    });
  });

  describe('la precarga', () => {
    it('guarda la vista del partido para poder pintarlo sin cobertura', async () => {
      const pideLaVista = vi.fn((id) => Promise.resolve(vistaDe(id)));

      await precargaElProximoDia({ partidos: [partido('m-1')], userId: USUARIO, pideLaVista, ahora: HOY });

      expect(loQueSeSupo('m-1').partida.matchId).toBe('m-1');
    });

    it('no guarda la vista de un partido que no juego', async () => {
      const pideLaVista = () => Promise.resolve(vistaDe('m-1', ['otro']));

      await precargaElProximoDia({ partidos: [partido('m-1')], userId: USUARIO, pideLaVista, ahora: HOY });

      expect(loQueSeSupo('m-1')).toBeNull();
    });

    it('un 404 o un 403 olvidan lo que hubiera: ese partido ya no está o no es mío', async () => {
      for (const estado of [404, 403]) {
        olvidaLasPrecargas();
        recuerda('m-1', { partida: vistaDe('m-1'), campo: null });

        await precargaElProximoDia({
          partidos: [partido('m-1')],
          userId: USUARIO,
          pideLaVista: () => Promise.reject(conEstado(estado)),
          ahora: HOY,
        });

        expect(loQueSeSupo('m-1')).toBeNull();
      }
    });

    it('un fallo de red deja lo que hubiera', async () => {
      recuerda('m-1', { partida: vistaDe('m-1'), campo: null });

      await precargaElProximoDia({
        partidos: [partido('m-1')],
        userId: USUARIO,
        pideLaVista: () => Promise.reject(new TypeError('Failed to fetch')),
        ahora: HOY,
      });

      expect(loQueSeSupo('m-1')).not.toBeNull();
    });

    it('si no cabe, calla y la cola de golpes ni se toca', async () => {
      const cola = JSON.stringify([{ matchId: 'x', holeNumber: 1, scoreData: { ownScore: 4 } }]);
      almacen.set('rydercup-scoring-queue', cola);
      const original = localStorage.setItem;
      localStorage.setItem = (k, v) => {
        if (k === 'rydercup-ultimo-conocido') throw new Error('quota');
        return original(k, v);
      };

      await expect(precargaElProximoDia({
        partidos: [partido('m-1')],
        userId: USUARIO,
        pideLaVista: (id) => Promise.resolve(vistaDe(id)),
        ahora: HOY,
      })).resolves.not.toThrow();

      expect(almacen.get('rydercup-scoring-queue')).toBe(cola);
    });

    it('no echa a la partida con golpes en la cola', async () => {
      almacen.set('rydercup-scoring-queue', JSON.stringify([{ matchId: 'a-1', holeNumber: 1, scoreData: {} }]));
      recuerda('a-1', { partida: vistaDe('a-1'), campo: null });
      recuerda('a-2', { partida: vistaDe('a-2'), campo: null });
      recuerda('a-3', { partida: vistaDe('a-3'), campo: null });

      await precargaElProximoDia({
        partidos: [partido('m-1')],
        userId: USUARIO,
        pideLaVista: (id) => Promise.resolve(vistaDe(id)),
        ahora: HOY,
      });

      expect(loQueSeSupo('a-1')).not.toBeNull();
      expect(loQueSeSupo('m-1')).not.toBeNull();
    });

    it('la tanda no se echa a sí misma al hacer sitio', async () => {
      // Cambia el calendario: X ya no está y entra S3. S1 se refresca en su
      // sitio, y al llegar S3 con dos precargadas se iba la primera, que era S1
      const pideLaVista = (id) => Promise.resolve(vistaDe(id));
      await precargaElProximoDia({ partidos: [partido('S1'), partido('X')], userId: USUARIO, pideLaVista, ahora: HOY });
      olvidaLasPrecargas();

      await precargaElProximoDia({ partidos: [partido('S1'), partido('S3')], userId: USUARIO, pideLaVista, ahora: HOY });

      expect(loQueSeSupo('S1')).not.toBeNull();
      expect(loQueSeSupo('S3')).not.toBeNull();
      expect(loQueSeSupo('X')).toBeNull();
    });

    it('al rato no se vuelve a pedir: cada vista cuesta del cubo compartido del campo', async () => {
      const pideLaVista = vi.fn((id) => Promise.resolve(vistaDe(id)));
      const lista = [partido('m-1')];

      await precargaElProximoDia({ partidos: lista, userId: USUARIO, pideLaVista, ahora: HOY });
      await precargaElProximoDia({ partidos: lista, userId: USUARIO, pideLaVista, ahora: new Date(HOY.getTime() + 10 * 60_000) });

      expect(pideLaVista).toHaveBeenCalledTimes(1);

      await precargaElProximoDia({ partidos: lista, userId: USUARIO, pideLaVista, ahora: new Date(HOY.getTime() + 16 * 60_000) });

      expect(pideLaVista).toHaveBeenCalledTimes(2);
    });

    it('si la vez anterior falló por red, se vuelve a intentar', async () => {
      const pideLaVista = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(vistaDe('m-1'));
      const lista = [partido('m-1')];

      await precargaElProximoDia({ partidos: lista, userId: USUARIO, pideLaVista, ahora: HOY });
      await precargaElProximoDia({ partidos: lista, userId: USUARIO, pideLaVista, ahora: new Date(HOY.getTime() + 60_000) });

      expect(loQueSeSupo('m-1')).not.toBeNull();
    });
  });

  describe('leer los próximos partidos', () => {
    const pideLaVista = (id) => Promise.resolve(vistaDe(id));

    it('con red: los enseña, los guarda y precarga', async () => {
      const lee = () => Promise.resolve({ matches: [partido('m-1')], complete: true });

      const r = await leeLosProximosPartidos({ lee, userId: USUARIO, pideLaVista, ahora: HOY });
      await asienta();

      expect(r).toEqual({ partidos: [partido('m-1')], desdeMemoria: false, sinRespuesta: false });
      expect(losUltimosPartidos()).toHaveLength(1);
      expect(loQueSeSupo('m-1')).not.toBeNull();
    });

    it('sin red y con lista guardada: enseña lo guardado y lo dice', async () => {
      recuerdaLosPartidos([partido('m-1')]);

      const r = await leeLosProximosPartidos({
        lee: () => Promise.reject(new TypeError('Failed to fetch')),
        userId: USUARIO,
        pideLaVista,
        ahora: HOY,
      });

      expect(r.partidos.map((p) => p.id)).toEqual(['m-1']);
      expect(r.desdeMemoria).toBe(true);
    });

    it('de lo guardado no salen los partidos de días pasados', async () => {
      recuerdaLosPartidos([partido('ayer', '2026-09-16'), partido('hoy')]);

      const r = await leeLosProximosPartidos({
        lee: () => Promise.reject(new TypeError('Failed to fetch')),
        userId: USUARIO,
        pideLaVista,
        ahora: HOY,
      });

      expect(r.partidos.map((p) => p.id)).toEqual(['hoy']);
    });

    it('sin red y sin nada guardado: que no se pudo preguntar, no que no hay', async () => {
      const r = await leeLosProximosPartidos({
        lee: () => Promise.reject(new TypeError('Failed to fetch')),
        userId: USUARIO,
        pideLaVista,
        ahora: HOY,
      });

      expect(r).toEqual({ partidos: [], desdeMemoria: false, sinRespuesta: true });
    });

    it('media lista se enseña, pero no pisa la completa que había', async () => {
      recuerdaLosPartidos([partido('m-1'), partido('m-2')]);

      const r = await leeLosProximosPartidos({
        lee: () => Promise.resolve({ matches: [partido('m-1')], complete: false }),
        userId: USUARIO,
        pideLaVista,
        ahora: HOY,
      });

      expect(r.partidos.map((p) => p.id)).toEqual(['m-1']);
      expect(losUltimosPartidos()).toHaveLength(2);
    });

    it('media lista VACÍA es como no haber respondido', async () => {
      recuerdaLosPartidos([partido('m-1')]);

      const r = await leeLosProximosPartidos({
        lee: () => Promise.resolve({ matches: [], complete: false }),
        userId: USUARIO,
        pideLaVista,
        ahora: HOY,
      });

      expect(r.desdeMemoria).toBe(true);
      expect(r.partidos.map((p) => p.id)).toEqual(['m-1']);
    });

    it('un 401 o un 403 desmienten: no se enseña lo guardado', async () => {
      for (const estado of [401, 403]) {
        olvidaTodo();
        recuerdaLosPartidos([partido('m-1')]);

        const r = await leeLosProximosPartidos({
          lee: () => Promise.reject(conEstado(estado)),
          userId: USUARIO,
          pideLaVista,
          ahora: HOY,
        });

        expect(r.partidos).toEqual([]);
        expect(r.desdeMemoria).toBe(false);
      }
    });
  });

  describe('la hora que se le enseña al jugador', () => {
    it('es la del CAMPO, no la del móvil que mira', () => {
      // Un torneo canario visto desde la península: `new Date(...)` más `Intl`
      // habría dicho 07:00, que no es la hora a la que el servidor abre
      expect(horaDelCampo('2026-09-19T06:00:00+01:00')).toBe('06:00');
      expect(horaDelCampo('2026-09-19T06:00:00+02:00')).toBe('06:00');
      expect(horaDelCampo('2026-09-19T18:00:00Z')).toBe('18:00');
    });

    it('una marca sin desfase no dice de dónde es: no se inventa', () => {
      expect(horaDelCampo('2026-09-19T06:00:00')).toBeNull();
      expect(horaDelCampo(null)).toBeNull();
      expect(horaDelCampo('mañana')).toBeNull();
    });

    it('y se escribe como se escriba en el idioma de quien mira (CodeRabbit)', () => {
      // La hora es la del campo, pero el FORMATO es el del jugador: en inglés,
      // «18:00» se lee como «6:00 PM». La hora en sí no se toca
      expect(horaDelCampo('2026-09-19T18:00:00+02:00', 'en-US')).toMatch(/6:00\s?PM/i);
      expect(horaDelCampo('2026-09-19T18:00:00+02:00', 'es-ES')).toBe('18:00');
    });

    it('una etiqueta de idioma rota no tumba la pantalla', () => {
      // `Intl` lanza RangeError con `es_ES`, y aquí revienta el render entero de
      // la anotación. Llega así desde `i18nextLng`
      expect(horaDelCampo('2026-09-19T18:00:00+02:00', 'es_ES')).toBe('18:00');
      expect(horaDelCampo('2026-09-19T18:00:00+02:00', 'en_US_POSIX')).toMatch(/6:00\s?PM/i);
      expect(horaDelCampo('2026-09-19T18:00:00+02:00', '@@@')).toBe('18:00');
    });
  });

  describe('cuándo se puede anotar', () => {
    it('en juego, siempre', () => {
      expect(sePuedeAnotar(partido('m', '2026-09-17', { status: 'IN_PROGRESS' }), { desdeMemoria: false, ahora: HOY })).toBe(true);
    });

    it('programado y con red, no: manda el servidor', () => {
      expect(sePuedeAnotar(partido('m'), { desdeMemoria: false, ahora: HOY })).toBe(false);
    });

    it('programado, de hoy y sin poder preguntar, sí: el móvil no sabe si ya empezó', () => {
      expect(sePuedeAnotar(partido('m'), { desdeMemoria: true, ahora: HOY })).toBe(true);
    });

    it('programado para mañana, ni sin red', () => {
      expect(sePuedeAnotar(partido('m', '2026-09-18'), { desdeMemoria: true, ahora: HOY })).toBe(false);
    });

    /**
     * LA TABLA de la FE #621 — la anotación abre sola a una hora (BE #305), y
     * la hora la dice el servidor en `scoringOpensAt`, con el huso del CAMPO
     * dentro. Aquí no se recalcula ninguna tabla de horas: se compara y ya.
     *
     *   #    caso                                          | se puede anotar
     *   -----|----------------------------------------------|----------------
     *   B2   programado y la hora ya pasó                    | sí
     *   B3   programado y la hora no ha llegado              | no
     *   B4   guardado por una versión vieja, sin la hora     | la regla de «es hoy»
     *   B5   el servidor no manda hora (campo sin coordenadas)| no: solo con START
     */
    it('B2: programado y con red, si la hora de apertura ya pasó, sí', () => {
      const abre = new Date(2026, 8, 17, 6, 0).toISOString();
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: abre }), { desdeMemoria: false, ahora: HOY })).toBe(true);
    });

    it('B3: programado y la hora aún no ha llegado, no', () => {
      const abre = new Date(2026, 8, 17, 18, 0).toISOString();
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: abre }), { desdeMemoria: false, ahora: HOY })).toBe(false);
    });

    it('B3b: y sin red tampoco, que la hora la sigue diciendo el servidor', () => {
      const abre = new Date(2026, 8, 17, 18, 0).toISOString();
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: abre }), { desdeMemoria: true, ahora: HOY })).toBe(false);
    });

    it('B4: lo guardado por una versión anterior no trae la hora: sigue la regla de «es hoy»', () => {
      expect(sePuedeAnotar(partido('m'), { desdeMemoria: true, ahora: HOY })).toBe(true);
      expect(sePuedeAnotar(partido('m', '2026-09-18'), { desdeMemoria: true, ahora: HOY })).toBe(false);
    });

    it('B5: un campo sin coordenadas no tiene hora, y con red manda el servidor', () => {
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: null }), { desdeMemoria: false, ahora: HOY })).toBe(false);
    });

    it('B5b: pero sin poder preguntar, el de HOY se sigue anotando aunque no tenga hora', () => {
      // Si no, un campo sin coordenadas se queda sin anotación sin cobertura,
      // que es justo lo que no se puede quitar (`/code-review`)
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: null }), { desdeMemoria: true, ahora: HOY })).toBe(true);
      expect(sePuedeAnotar(partido('m', '2026-09-18', { scoringOpensAt: null }), { desdeMemoria: true, ahora: HOY })).toBe(false);
    });

    it('B5c: y una hora ilegible se trata igual que no tenerla', () => {
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: 'mañana' }), { desdeMemoria: true, ahora: HOY })).toBe(true);
      expect(sePuedeAnotar(partido('m', '2026-09-17', { scoringOpensAt: 'mañana' }), { desdeMemoria: false, ahora: HOY })).toBe(false);
    });

    it('en juego manda el estado, aunque la hora no haya llegado', () => {
      const abre = new Date(2026, 8, 17, 18, 0).toISOString();
      expect(sePuedeAnotar(partido('m', '2026-09-17', { status: 'IN_PROGRESS', scoringOpensAt: abre }), { desdeMemoria: false, ahora: HOY })).toBe(true);
    });
  });
});
