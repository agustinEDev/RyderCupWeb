import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../composition', () => ({
  submitHoleScoreUseCase: { execute: vi.fn() },
  submitTeeGroupHoleScoreUseCase: { execute: vi.fn() },
}));

// La cola y los avisos viven en `localStorage`; arriba del todo, antes de importar
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => {
      datos[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete datos[clave];
    },
    clear: () => {
      datos = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', {
  value: almacen,
  writable: true,
});

import { submitHoleScoreUseCase } from '../composition';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as cola from '../utils/scoringOfflineQueue';
import { vaciaAnotaciones } from './vaciaAnotaciones';
import { vaciaLaColaEntera } from './vaciadoDeLaCola';

/**
 * FS-03 (re-auditoría del 16 nov 2026): lo guardado en el móvil caduca.
 *
 * | #  | Caso                                         | Qué pasa                                  |
 * |----|----------------------------------------------|-------------------------------------------|
 * | C1 | golpe en la cola de menos de 48 h            | se envía, como siempre                    |
 * | C2 | golpe en la cola de más de 48 h              | no se envía: pasa a aviso (como un rechazo)|
 * | C2b| y el aviso no cabe                           | el golpe se queda; nunca desaparece mudo  |
 * | C3 | aviso de más de 7 días                       | no se lee, y se borra del móvil           |
 * | C4 | lo huérfano y lo de partida rápida caducado  | también pasa a aviso en el vaciado global |
 * | C5 | sin fecha                                    | caducado                                  |
 * | C6 | fecha en el futuro (reloj cambiado)          | no caduca                                 |
 * | C7 | la partida abierta                           | la vacía su pantalla, no el global        |
 *
 * 48 h para todo (Agustín, 16 nov 2026): las partidas rápidas se cierran solas al acabar
 * el día siguiente y los torneos lo harán con BE #469 y #878. El aviso le cuenta a su
 * dueño que no entró, y puede volver a anotar el hoyo.
 */

const YO = 'usuario-A';
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const AHORA = new Date('2026-11-20T10:00:00Z').getTime();

const guardaHace = (ms, ...args) => {
  vi.setSystemTime(AHORA - ms);
  cola.enqueue(...args);
  vi.setSystemTime(AHORA);
};

describe('caducidad de lo guardado sin cobertura (FS-03)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    submitHoleScoreUseCase.execute.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('la cola: 48 h', () => {
    it('C1: un golpe de 47 h se envía', async () => {
      guardaHace(47 * HORA, 'p-1', 3, { ownScore: 4 }, null, YO);

      const r = await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
      expect(r.enviadas).toBe(1);
      expect(golpesPerdidos.pendientes(YO)).toEqual([]);
    });

    it('C2: uno de 49 h no se envía y pasa a aviso de su dueño, con su partida', async () => {
      guardaHace(49 * HORA, 'p-1', 3, { ownScore: 4 }, null, YO, {
        matchName: 'Sábado',
        matchNumber: 2,
      });

      const r = await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(r.descartadas).toBe(1);
      expect(cola.getAll()).toEqual([]);
      const [aviso] = golpesPerdidos.pendientes(YO);
      expect(aviso).toMatchObject({
        matchId: 'p-1',
        holeNumber: 3,
        matchName: 'Sábado',
        matchNumber: 2,
        userId: YO,
      });
      // El aviso cuenta desde ahora: vive sus 7 días para que lo vea
      expect(aviso.cuando).toBe(AHORA);
      // Y dice que caducó, no que el servidor lo rechazara
      expect(aviso.caducado).toBe(true);
    });

    it('C2b: si el aviso no cabe, el golpe se queda en la cola', async () => {
      guardaHace(49 * HORA, 'p-1', 3, { ownScore: 4 }, null, YO);
      vi.spyOn(golpesPerdidos, 'apunta').mockReturnValue(false);

      await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(cola.getAll()).toHaveLength(1);
    });

    it('C5: una entrada sin fecha cuenta como caducada', () => {
      expect(cola.estaCaducada({ matchId: 'p', holeNumber: 1 }, AHORA)).toBe(
        true,
      );
    });

    it('C6: una fecha en el futuro no caduca', () => {
      expect(cola.estaCaducada({ timestamp: AHORA + 3 * DIA }, AHORA)).toBe(
        false,
      );
    });

    it('justo en el límite de 48 h todavía vale', () => {
      expect(cola.estaCaducada({ timestamp: AHORA - 48 * HORA }, AHORA)).toBe(
        false,
      );
      expect(
        cola.estaCaducada({ timestamp: AHORA - 48 * HORA - 1 }, AHORA),
      ).toBe(true);
    });

    it('vaciaAnotaciones no manda una caducada: la aparta como un rechazo y avisa en pantalla', async () => {
      guardaHace(3 * DIA, 'p-1', 5, { ownScore: 6 }, null, YO);
      const manda = vi.fn();
      const alDescartar = vi.fn();

      const r = await vaciaAnotaciones({
        entradas: cola.deQuien(YO),
        manda,
        alDescartar,
      });

      expect(manda).not.toHaveBeenCalled();
      expect(alDescartar).toHaveBeenCalledTimes(1);
      expect(r.descartadas).toBe(1);
      expect(cola.getAll()).toEqual([]);
      expect(golpesPerdidos.pendientes(YO)).toHaveLength(1);
    });
    it('el aviso lleva el nombre que la partida recibió mientras iba el vaciado', async () => {
      guardaHace(3 * DIA, 'p-1', 5, { ownScore: 6 }, null, YO);
      const entradas = cola.deQuien(YO);
      cola.ponleNombre('p-1', { matchName: 'Domingo' });

      await vaciaAnotaciones({ entradas, manda: vi.fn() });

      expect(golpesPerdidos.pendientes(YO)[0].matchName).toBe('Domingo');
    });
  });

  describe('C4: lo que el vaciado global no envía, sí lo caduca', () => {
    it('lo huérfano caducado pasa a aviso (sin dueño, como siempre)', async () => {
      guardaHace(5 * DIA, 'p-vieja', 1, { ownScore: 4 }, null, null);

      await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(cola.getAll()).toEqual([]);
      expect(golpesPerdidos.pendientes(YO)).toHaveLength(1);
    });

    it('lo huérfano elegido por caducado que se vuelve a guardar a mitad del vaciado no se manda: cuenta como cambiado (CodeRabbit en FE #1166)', async () => {
      guardaHace(5 * DIA, 'p-a', 1, { ownScore: 4 }, null, null);
      guardaHace(5 * DIA, 'p-b', 2, { ownScore: 5 }, null, null);
      // Mientras se aparta el primero, alguien vuelve a guardar el segundo
      // (fecha de ahora): ya no está caducado cuando le llega el turno
      const apuntaDeVerdad = golpesPerdidos.apunta;
      vi.spyOn(golpesPerdidos, 'apunta').mockImplementation((aviso) => {
        if (aviso.matchId === 'p-a')
          cola.enqueue('p-b', 2, { ownScore: 5 }, null, null);
        return apuntaDeVerdad(aviso);
      });

      await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(cola.getAll().map((e) => e.matchId)).toEqual(['p-b']);
    });

    it('lo huérfano sin caducar sigue sin tocarse', async () => {
      guardaHace(HORA, 'p', 1, { ownScore: 4 }, null, null);

      await vaciaLaColaEntera({ userId: YO });

      expect(cola.getAll()).toHaveLength(1);
    });

    it('lo de partida rápida caducado pasa a aviso; sin caducar se deja a su pantalla', async () => {
      guardaHace(3 * DIA, 'rapida-1', 7, { score: 5 }, 'participante-1', YO);
      guardaHace(HORA, 'rapida-2', 7, { score: 5 }, 'participante-1', YO);

      await vaciaLaColaEntera({ userId: YO });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(cola.getAll().map((e) => e.matchId)).toEqual(['rapida-2']);
      expect(golpesPerdidos.pendientes(YO).map((a) => a.matchId)).toEqual([
        'rapida-1',
      ]);
    });

    it('lo de otra cuenta del móvil no lo caduca esta', async () => {
      guardaHace(3 * DIA, 'p', 1, { ownScore: 4 }, null, 'usuario-B');

      await vaciaLaColaEntera({ userId: YO });

      expect(cola.getAll()).toHaveLength(1);
    });

    it('C7: la partida abierta no la caduca el global: la vacía su pantalla', async () => {
      guardaHace(3 * DIA, 'abierta', 1, { ownScore: 4 }, null, YO);

      await vaciaLaColaEntera({ userId: YO, saltaPartida: 'abierta' });

      expect(cola.getAll()).toHaveLength(1);
    });
  });

  describe('C3: los avisos, 7 días', () => {
    const avisoHace = (ms, extra = {}) => {
      vi.setSystemTime(AHORA - ms);
      golpesPerdidos.apunta({
        matchId: `m-${ms}`,
        matchName: null,
        matchNumber: null,
        holeNumber: 1,
        participantId: null,
        userId: YO,
        ...extra,
      });
      vi.setSystemTime(AHORA);
    };

    it('uno de 6 días se lee; uno de 8 no', () => {
      avisoHace(6 * DIA);
      avisoHace(8 * DIA);

      expect(golpesPerdidos.pendientes(YO).map((a) => a.matchId)).toEqual([
        `m-${6 * DIA}`,
      ]);
      expect(golpesPerdidos.pendientes().map((a) => a.matchId)).toEqual([
        `m-${6 * DIA}`,
      ]);
    });

    it('sin fecha cuenta como caducado (C5); en el futuro no (C6)', () => {
      almacen.setItem(
        'rydercup-golpes-perdidos',
        JSON.stringify([
          { matchId: 'sin-fecha', holeNumber: 1, userId: YO },
          { matchId: 'futuro', holeNumber: 1, userId: YO, cuando: AHORA + DIA },
        ]),
      );

      expect(golpesPerdidos.pendientes(YO).map((a) => a.matchId)).toEqual([
        'futuro',
      ]);
    });

    it('el vaciado global los borra del móvil, aunque no haya nada que enviar', async () => {
      avisoHace(8 * DIA);
      avisoHace(DIA);

      await vaciaLaColaEntera({ userId: YO });

      const crudo = JSON.parse(almacen.getItem('rydercup-golpes-perdidos'));
      expect(crudo.map((a) => a.matchId)).toEqual([`m-${DIA}`]);
    });

    it('sin nada caducado no reescribe los avisos', async () => {
      avisoHace(DIA);
      const escribe = vi.spyOn(almacen, 'setItem');

      golpesPerdidos.purgaLosCaducados();

      expect(escribe).not.toHaveBeenCalled();
    });
  });
});

describe('el aviso de un rechazo no se marca como caducado', () => {
  beforeEach(() => {
    almacen.clear();
    vi.restoreAllMocks();
  });

  it('un 404 de un golpe reciente deja un aviso sin la marca', async () => {
    cola.enqueue('p-2', 1, { ownScore: 4 }, null, YO);
    const manda = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('HTTP 404'), { status: 404 }));

    await vaciaAnotaciones({ entradas: cola.deQuien(YO), manda });

    const [aviso] = golpesPerdidos.pendientes(YO);
    expect(aviso.matchId).toBe('p-2');
    expect(aviso.caducado).toBeUndefined();
  });

  it('si el mismo hoyo se rechaza después de caducar otro aviso suyo, deja de ser caducado', () => {
    golpesPerdidos.apunta({
      matchId: 'p-3',
      holeNumber: 2,
      userId: YO,
      caducado: true,
    });
    golpesPerdidos.apunta({ matchId: 'p-3', holeNumber: 2, userId: YO });

    expect(golpesPerdidos.pendientes(YO)[0].caducado).toBeUndefined();
  });
});
