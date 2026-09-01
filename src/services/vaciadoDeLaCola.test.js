import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../composition', () => ({
  submitHoleScoreUseCase: { execute: vi.fn() },
}));

// El entorno de este fichero no trae `localStorage`, y la cola vive ahí. Se
// define al principio del fichero a propósito: hacerlo dentro de un `beforeEach`
// deja el módulo ya importado leyendo el objeto que no es
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });

import { submitHoleScoreUseCase } from '../composition';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as cola from '../utils/scoringOfflineQueue';
import { vaciaLaColaEntera } from './vaciadoDeLaCola';

const errorCon = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const sinRed = () => new TypeError('Failed to fetch');

const YO = 'usuario-A';
const OTRO = 'usuario-B';

describe('vaciaLaColaEntera (FE #521)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    submitHoleScoreUseCase.execute.mockResolvedValue({});
  });

  it('envía los golpes de una partida que ya no se abre', async () => {
    // El corazón de la issue: hasta ahora cada pantalla vaciaba lo suyo y lo de
    // las demás no lo tocaba nadie
    cola.enqueue('partida-vieja', 3, { ownScore: 4 }, null, YO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('partida-vieja', 3, { ownScore: 4 });
    expect(resultado.enviadas).toBe(1);
    expect(cola.deQuien(YO)).toHaveLength(0);
  });

  it('no toca la partida que se está anotando ahora mismo', async () => {
    // Esa la vacía su propia pantalla, que además sabe resolver desacuerdos
    cola.enqueue('la-abierta', 1, { ownScore: 4 }, null, YO);
    cola.enqueue('otra', 2, { ownScore: 5 }, null, YO);

    await vaciaLaColaEntera({ userId: YO, saltaPartida: 'la-abierta' });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    expect(cola.deQuien(YO).map((e) => e.matchId)).toEqual(['la-abierta']);
  });

  it('no envía lo de otra persona', async () => {
    cola.enqueue('partida', 1, { ownScore: 4 }, null, OTRO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(resultado.enviadas).toBe(0);
    // Y sobre todo: sigue ahí, esperando a que vuelva su dueño
    expect(cola.deQuien(OTRO)).toHaveLength(1);
  });

  it('no envía lo huérfano: aquí no hay nadie mirando', async () => {
    // Lo guardado por una versión anterior no lleva dueño. Se envía desde la
    // pantalla de su partida, donde hay contexto, no desde un vaciado de fondo
    cola.enqueue('partida', 1, { ownScore: 4 }, null, null);

    await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(cola.getAll()).toHaveLength(1);
  });

  it('no envía las de partida rápida: las decide su pantalla', async () => {
    // Su vaciado compara con el servidor y pregunta al jugador cuando hay
    // desacuerdo (FE #528). Mandarlas desde aquí las enviaría a ciegas
    cola.enqueue('rapida', 1, { score: 4 }, 'participante-1', YO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(resultado.enviadas).toBe(0);
    expect(cola.deQuien(YO)).toHaveLength(1);
  });

  it('sin sesión no manda nada', async () => {
    cola.enqueue('partida', 1, { ownScore: 4 }, null, YO);

    const resultado = await vaciaLaColaEntera({ userId: null });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(resultado.enviadas).toBe(0);
  });
});

describe('vaciaLaColaEntera · cuando algo va mal (FE #521)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    submitHoleScoreUseCase.execute.mockResolvedValue({});
  });

  it('un golpe rechazado sale de la cola, pero deja aviso', async () => {
    // La partida terminó o se canceló: reintentarlo en cada reconexión no lo va
    // a salvar. Y sacarlo en silencio es hacer desaparecer un golpe
    submitHoleScoreUseCase.execute.mockRejectedValue(errorCon(409));
    cola.enqueue('terminada', 7, { ownScore: 5 }, null, YO, 'Meis Scratch');

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(resultado.descartadas).toBe(1);
    expect(cola.deQuien(YO)).toHaveLength(0);
    expect(golpesPerdidos.pendientes(YO)).toEqual([
      expect.objectContaining({ matchId: 'terminada', holeNumber: 7 }),
    ]);
  });

  it('si el aviso no cabe, el golpe NO se borra', async () => {
    // Preferible reintentarlo mil veces a que desaparezca sin que nadie lo
    // sepa, que es justo lo que esta issue existe para impedir
    submitHoleScoreUseCase.execute.mockRejectedValue(errorCon(409));
    cola.enqueue('terminada', 7, { ownScore: 5 }, null, YO);
    vi.spyOn(almacen, 'setItem').mockImplementation((clave) => {
      if (clave === 'rydercup-golpes-perdidos') throw new Error('QuotaExceededError');
    });

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(resultado.descartadas).toBe(0);
    expect(cola.deQuien(YO)).toHaveLength(1);
  });

  it.each([401, 408, 429])('un %s no borra nada: no es culpa del golpe', async (codigo) => {
    submitHoleScoreUseCase.execute.mockRejectedValue(errorCon(codigo));
    cola.enqueue('partida', 1, { ownScore: 4 }, null, YO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(resultado.descartadas).toBe(0);
    expect(cola.deQuien(YO)).toHaveLength(1);
    expect(golpesPerdidos.pendientes(YO)).toEqual([]);
  });

  it('si se cae la red, para y deja el resto para la próxima', async () => {
    // Seguir intentando con la red caída es gastar batería para nada
    submitHoleScoreUseCase.execute
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(sinRed());
    cola.enqueue('una', 1, { ownScore: 4 }, null, YO);
    cola.enqueue('una', 2, { ownScore: 5 }, null, YO);
    cola.enqueue('una', 3, { ownScore: 6 }, null, YO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(resultado.enviadas).toBe(1);
    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2);
    expect(cola.deQuien(YO)).toHaveLength(2);
  });

  it('una entrada imposible no bloquea a las demás', async () => {
    // El caso de uso valida antes de enviar y lanza un Error pelado. Como el
    // vaciado recorre la cola ENTERA, una sola entrada mala a la cabeza dejaría
    // sin enviar los golpes de todas las demás partidas, para siempre
    submitHoleScoreUseCase.execute
      .mockRejectedValueOnce(new Error('Marked player ID is required'))
      .mockResolvedValue({});
    cola.enqueue('rota', 1, { ownScore: null }, null, YO);
    cola.enqueue('buena', 2, { ownScore: 5 }, null, YO);

    const resultado = await vaciaLaColaEntera({ userId: YO });

    expect(resultado.enviadas).toBe(1);
    // La rota se queda: no se pierde, solo no bloquea
    expect(cola.deQuien(YO).map((e) => e.matchId)).toEqual(['rota']);
  });

  it('una corrección hecha mientras el golpe iba en vuelo no se borra', async () => {
    cola.enqueue('partida', 5, { ownScore: 6 }, null, YO);
    submitHoleScoreUseCase.execute.mockImplementation(async () => {
      cola.enqueue('partida', 5, { ownScore: 4 }, null, YO);
      return {};
    });

    await vaciaLaColaEntera({ userId: YO });

    const quedan = cola.deQuien(YO);
    expect(quedan).toHaveLength(1);
    expect(quedan[0].scoreData).toEqual({ ownScore: 4 });
  });

  it('dos vaciados a la vez no envían lo mismo dos veces', async () => {
    cola.enqueue('una', 1, { ownScore: 4 }, null, YO);

    const [a, b] = await Promise.all([
      vaciaLaColaEntera({ userId: YO }),
      vaciaLaColaEntera({ userId: YO }),
    ]);

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    expect(a.enviadas + b.enviadas).toBe(1);
  });
});

describe('vaciaLaColaEntera · qué cuenta como caída de red (FE #521)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it.each([
    ['Failed to fetch', 'Chrome'],
    ['NetworkError when attempting to fetch resource.', 'Firefox'],
    ['Load failed', 'Safari'],
  ])('«%s» (%s) para el vaciado', async (mensaje) => {
    submitHoleScoreUseCase.execute.mockRejectedValue(new Error(mensaje));
    cola.enqueue('una', 1, { ownScore: 4 }, null, YO);
    cola.enqueue('otra', 2, { ownScore: 5 }, null, YO);

    await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    'Marked player ID is required',
    'Score must be between 1 and 15',
  ])('«%s» NO es la red: se salta y sigue', async (mensaje) => {
    // «requi-RED» contiene «red». Un patrón laxo convertía un error de
    // validación en una caída de red y bloqueaba la cola entera
    submitHoleScoreUseCase.execute.mockRejectedValue(new Error(mensaje));
    cola.enqueue('una', 1, { ownScore: 4 }, null, YO);
    cola.enqueue('otra', 2, { ownScore: 5 }, null, YO);

    await vaciaLaColaEntera({ userId: YO });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
