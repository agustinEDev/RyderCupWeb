import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueue, dequeue, getAll, remove, clear, size, getByMatch, deQuien, resumenPorPartida, ponleNombre, marcaDesaparecida, olvidaLasDe} from './scoringOfflineQueue';

// Mock localStorage for non-jsdom environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('scoringOfflineQueue', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add a score to the queue', () => {
      enqueue('m-1', 3, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });

      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].matchId).toBe('m-1');
      expect(queue[0].holeNumber).toBe(3);
      expect(queue[0].scoreData.ownScore).toBe(5);
      expect(queue[0].timestamp).toBeGreaterThan(0);
    });

    it('should replace existing entry for same match+hole', () => {
      enqueue('m-1', 3, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 3, { ownScore: 6, markedPlayerId: 'u2', markedScore: 5 });

      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].scoreData.ownScore).toBe(6);
    });

    it('should keep different holes as separate entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      expect(getAll()).toHaveLength(2);
    });

    it('should keep different matches as separate entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-2', 1, { ownScore: 5, markedPlayerId: 'u3', markedScore: 5 });

      expect(getAll()).toHaveLength(2);
    });
  });

  describe('dequeue', () => {
    it('should return and remove the first entry', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      const entry = dequeue();
      expect(entry.holeNumber).toBe(1);
      expect(getAll()).toHaveLength(1);
    });

    it('should return null when queue is empty', () => {
      expect(dequeue()).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a specific entry', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      remove('m-1', 1);
      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].holeNumber).toBe(2);
    });

    it('should do nothing when entry does not exist', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      remove('m-1', 99);
      expect(getAll()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      clear();
      expect(getAll()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(size()).toBe(0);
    });

    it('should return the number of entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      expect(size()).toBe(2);
    });
  });

  describe('getAll', () => {
    it('should return empty array when localStorage is empty', () => {
      expect(getAll()).toEqual([]);
    });

    it('should handle corrupt localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');
      expect(getAll()).toEqual([]);
    });
  });

  describe('getByMatch', () => {
    it('should return entries for a specific match', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-2', 1, { ownScore: 5, markedPlayerId: 'u3', markedScore: 5 });
      enqueue('m-1', 2, { ownScore: 3, markedPlayerId: 'u2', markedScore: 3 });

      const entries = getByMatch('m-1');
      expect(entries).toHaveLength(2);
      expect(entries[0].matchId).toBe('m-1');
      expect(entries[1].matchId).toBe('m-1');
    });

    it('should return empty array when no entries for match', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      expect(getByMatch('m-99')).toEqual([]);
    });
  });
});

describe('anotaciones por participante (FE #515)', () => {
  beforeEach(() => localStorage.clear());

  it('dos participantes del mismo hoyo no se pisan', () => {
    // En una partida rápida cada participante se envía por separado. Sin el
    // participante en la clave, anotar el segundo borraba el primero
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 4 }, 'p-2');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(2);
    expect(guardadas.map((e) => e.participantId).sort()).toEqual(['p-1', 'p-2']);
  });

  it('reanotar el mismo hoyo del mismo participante reemplaza, no duplica', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 6 }, 'p-1');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].scoreData).toEqual({ score: 6 });
  });

  it('quita solo la anotación de ese participante', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 4 }, 'p-2');

    remove('qm-1', 7, 'p-1');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].participantId).toBe('p-2');
  });

  it('dos bolas recogidas en el mismo hoyo son dos anotaciones, no una', () => {
    // Un hoyo recogido llega con `score` nulo, igual que llegaría el de
    // cualquier otro. Sin el participante en la clave, la segunda pisaba a la
    // primera y el hoyo quedaba anotado a medias
    enqueue('qm-1', 7, { score: null }, 'p-1');
    enqueue('qm-1', 7, { score: null }, 'p-2');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(2);
    expect(guardadas.every((e) => e.scoreData.score === null)).toBe(true);
    expect(guardadas.map((e) => e.participantId).sort()).toEqual(['p-1', 'p-2']);
  });

  it('reanotar sobre una entrada guardada por una versión anterior la reemplaza', () => {
    // El caso que de verdad duplicaría: la entrada vieja no tiene el campo, y
    // competición reanota ese mismo hoyo
    localStorage.setItem(
      'rydercup-scoring-queue',
      JSON.stringify([{ matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, timestamp: 1 }])
    );

    enqueue('m-1', 7, { ownScore: 6 });

    const guardadas = getByMatch('m-1');
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].scoreData).toEqual({ ownScore: 6 });
  });

  it('la cuenta puede pedirse solo de una partida', () => {
    // La cola la comparten los dos modos: contarla entera enseñaba «N
    // pendientes» incluyendo anotaciones de otra partida
    enqueue('m-1', 7, { ownScore: 5 });
    enqueue('qm-1', 7, { score: 4 }, 'p-1');
    enqueue('qm-1', 8, { score: 3 }, 'p-1');

    expect(size()).toBe(3);
    expect(size('m-1')).toBe(1);
    expect(size('qm-1')).toBe(2);
  });

  it('una partida sin id no tiene pendientes, no los tiene todos', () => {
    // Decidir por veracidad devolvía la cuenta global con una cadena vacía,
    // que es justo lo que se venía a quitar
    enqueue('m-1', 7, { ownScore: 5 });
    enqueue('qm-1', 7, { score: 4 }, 'p-1');

    expect(size('')).toBe(0);
    expect(size()).toBe(2);
  });

  it('no confunde una anotación de competición con una de partida rápida', () => {
    // Competición no manda participante: su entrada va sin él y no debe
    // borrarse al guardar una de partida rápida del mismo hoyo
    enqueue('m-1', 7, { ownScore: 5 });
    enqueue('m-1', 7, { score: 4 }, 'p-1');

    expect(getByMatch('m-1')).toHaveLength(2);
  });

  it('entiende una cola guardada por una versión anterior', () => {
    // Sin el campo `participantId`: `undefined` cuenta como «de nadie»
    localStorage.setItem(
      'rydercup-scoring-queue',
      JSON.stringify([{ matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, timestamp: 1 }])
    );

    remove('m-1', 7);

    expect(getByMatch('m-1')).toHaveLength(0);
  });
});

describe('scoringOfflineQueue · cuando el móvil no puede guardar', () => {
  const seNiega = () => {
    localStorage.setItem.mockImplementationOnce(() => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    });
  };

  it('enqueue dice que no en vez de reventar', () => {
    // Un iPhone sin espacio, o una ventana privada: `setItem` se niega. Si el
    // fallo sube, sale del `catch` de quien anota como un rechazo que nadie
    // recoge, y el golpe desaparece sin recuadro rojo ni aviso ámbar
    seNiega();
    expect(enqueue('m-1', 7, { score: 5 }, 'p-1')).toBe(false);
  });

  it('enqueue dice que sí cuando guarda', () => {
    expect(enqueue('m-1', 7, { score: 5 }, 'p-1')).toBe(true);
  });

  it('remove no revienta si el almacenamiento se niega', () => {
    enqueue('m-1', 7, { score: 5 }, 'p-1');
    seNiega();
    expect(() => remove('m-1', 7, 'p-1')).not.toThrow();
  });
});

describe('scoringOfflineQueue — de quién es cada anotación (FE #521)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('dos personas pueden tener guardado el mismo hoyo sin pisarse', () => {
    // Antes el dueño no formaba parte de la identidad: mismo partido y mismo
    // hoyo era «la misma anotación», así que la segunda borraba la primera y
    // un golpe desaparecía sin dejar rastro
    enqueue('m-1', 7, { ownScore: 5 }, null, 'usuario-A');
    enqueue('m-1', 7, { ownScore: 4 }, null, 'usuario-B');

    const todas = getAll();
    expect(todas).toHaveLength(2);
    expect(todas.map((e) => e.userId).sort()).toEqual(['usuario-A', 'usuario-B']);
  });

  it('la misma persona sí se corrige a sí misma', () => {
    enqueue('m-1', 7, { ownScore: 5 }, null, 'usuario-A');
    enqueue('m-1', 7, { ownScore: 4 }, null, 'usuario-A');

    expect(getAll()).toHaveLength(1);
    expect(getAll()[0].scoreData).toEqual({ ownScore: 4 });
  });

  it('borrar sin decir de quién solo se lleva lo huérfano', () => {
    // Al revés que al leer: `getByMatch` sin dueño devuelve las de todos, y
    // `remove` sin dueño no toca ninguna de ellas. Queda fijado aquí porque es
    // asimétrico y se presta a confusión
    enqueue('m-1', 7, { ownScore: 5 }, null, 'usuario-A');
    enqueue('m-1', 7, { ownScore: 4 }, null, null);

    remove('m-1', 7);

    const quedan = getAll();
    expect(quedan).toHaveLength(1);
    expect(quedan[0].userId).toBe('usuario-A');
  });

  it('borrar lo de uno no se lleva lo del otro', () => {
    enqueue('m-1', 7, { ownScore: 5 }, null, 'usuario-A');
    enqueue('m-1', 7, { ownScore: 4 }, null, 'usuario-B');

    remove('m-1', 7, null, 'usuario-B');

    const quedan = getAll();
    expect(quedan).toHaveLength(1);
    expect(quedan[0].userId).toBe('usuario-A');
  });

  it('getByMatch trae lo tuyo y lo huérfano, nunca lo de otro', () => {
    // Lo huérfano es de una versión anterior a este campo: dejarlo fuera de la
    // pantalla de su propia partida sería condenarlo a no enviarse jamás
    enqueue('m-1', 1, { ownScore: 4 }, null, 'usuario-A');
    enqueue('m-1', 2, { ownScore: 5 }, null, 'usuario-B');
    enqueue('m-1', 3, { ownScore: 6 }, null, null);

    const deA = getByMatch('m-1', 'usuario-A');

    expect(deA.map((e) => e.holeNumber).sort()).toEqual([1, 3]);
  });

  it('deQuien NO recoge lo huérfano: el servidor lo daría por bueno', () => {
    // Se probó al revés, para rescatar la cola del parque instalado, y es un
    // error caro: el servidor atribuye el golpe al usuario AUTENTICADO, así
    // que en un móvil compartido donde los dos juegan el mismo partido, los
    // golpes del primero se escriben en la tarjeta del segundo con un 200. Sin
    // rechazo no hay aviso, y desaparecen en silencio
    enqueue('m-1', 1, { ownScore: 4 }, null, 'usuario-A');
    enqueue('m-1', 3, { ownScore: 6 }, null, null);

    expect(deQuien('usuario-A').map((e) => e.holeNumber)).toEqual([1]);
  });

  it('pero el panel SÍ lo enseña: se rescata con alguien delante', () => {
    // El aviso lleva a la pantalla de esa partida, que sí incluye lo huérfano.
    // Ahí hay contexto y un acto explícito, que es la diferencia
    enqueue('m-1', 3, { ownScore: 6 }, null, null);

    expect(resumenPorPartida('usuario-A')).toEqual([
      expect.objectContaining({ matchId: 'm-1', cuantas: 1 }),
    ]);
    expect(getByMatch('m-1', 'usuario-A')).toHaveLength(1);
  });

  it('pero no recoge lo de otra cuenta del mismo móvil', () => {
    enqueue('m-1', 1, { ownScore: 4 }, null, 'usuario-A');
    enqueue('m-1', 3, { ownScore: 6 }, null, 'usuario-B');

    expect(deQuien('usuario-A').map((e) => e.holeNumber)).toEqual([1]);
  });

  it('sin sesión no se envía nada, ni siquiera lo huérfano', () => {
    enqueue('m-1', 3, { ownScore: 6 }, null, null);

    expect(deQuien(null)).toEqual([]);
  });

  it('sin userId se sigue viendo todo, como antes', () => {
    // Quien todavía no pasa el dueño no puede quedarse sin ver su cola
    enqueue('m-1', 1, { ownScore: 4 }, null, 'usuario-A');

    expect(getByMatch('m-1')).toHaveLength(1);
    expect(size('m-1')).toBe(1);
  });
});

describe('ponleNombre (FE #551)', () => {
  beforeEach(() => {
    clear();
  });

  it('rellena lo que se guardó sin nombre', () => {
    // Arranque en frío sin cobertura: la vista de la partida no llega nunca y
    // todo lo anotado ese día queda sin nombre, así que el panel enseña «una
    // partida anterior» — o dos avisos iguales si hay dos partidas
    enqueue('m-1', 3, { ownScore: 4 }, null, 'u1');
    enqueue('m-1', 4, { ownScore: 5 }, null, 'u1');

    expect(ponleNombre('m-1', { matchName: 'La Herrería', matchNumber: 3 })).toBe(true);

    expect(resumenPorPartida('u1')).toEqual([
      expect.objectContaining({ matchName: 'La Herrería', matchNumber: 3, cuantas: 2 }),
    ]);
  });

  it('pero no pisa lo que ya tenía nombre', () => {
    // Lo guardado es de cuando se anotó, y es más fiable que lo de ahora
    enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'El de aquel día', matchNumber: 1 });

    ponleNombre('m-1', { matchName: 'Otro', matchNumber: 9 });

    expect(resumenPorPartida('u1')).toEqual([
      expect.objectContaining({ matchName: 'El de aquel día', matchNumber: 1 }),
    ]);
  });

  it('con nombre pero sin número, conserva el nombre y gana el número', () => {
    // El caso que de verdad ejercita el `??`: la entrada entra en el cuerpo
    // del bucle porque le falta el número, y ahí el nombre no se puede pisar
    enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'El de aquel día' });

    ponleNombre('m-1', { matchName: 'Otro', matchNumber: 9 });

    expect(resumenPorPartida('u1')).toEqual([
      expect.objectContaining({ matchName: 'El de aquel día', matchNumber: 9 }),
    ]);
  });

  it('y no toca las de otras partidas', () => {
    enqueue('m-1', 3, { ownScore: 4 }, null, 'u1');
    enqueue('m-2', 3, { ownScore: 4 }, null, 'u1');

    ponleNombre('m-1', { matchName: 'La Herrería' });

    const otra = resumenPorPartida('u1').find((p) => p.matchId === 'm-2');
    expect(otra.matchName).toBeNull();
  });
});

describe('la partida que ya no existe (FE #557)', () => {
  beforeEach(() => {
    clear();
  });

  it('marcarla no borra nada, y el resumen lo dice', () => {
    // Un 404 lo devuelve igual el portal cautivo de un club: borrar por eso
    // perdería un golpe bueno
    enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1');
    enqueue('m-2', 3, { ownScore: 4 }, null, 'u1');

    expect(marcaDesaparecida('qm-1')).toBe(true);

    expect(size()).toBe(2);
    const resumen = resumenPorPartida('u1');
    expect(resumen.find((p) => p.matchId === 'qm-1').desaparecida).toBe(true);
    expect(resumen.find((p) => p.matchId === 'm-2').desaparecida).toBe(false);
  });

  it('se quita cuando la partida vuelve a cargar: aquel 404 era mentira', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1');
    marcaDesaparecida('qm-1');

    marcaDesaparecida('qm-1', false);

    expect(resumenPorPartida('u1')[0].desaparecida).toBe(false);
  });

  it('no escribe si no hay nada que cambiar', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1');
    // `localStorage.setItem` ya es un espía en este fichero
    localStorage.setItem.mockClear();

    expect(marcaDesaparecida('qm-1', false)).toBe(true);

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('olvidarlas se lleva las de esa partida, y solo las que esa cuenta ve', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1');
    enqueue('qm-1', 8, { score: 4 }, 'p-2', 'u2');
    // Sin dueño: de una versión anterior a FE #521, y la ve cualquiera
    enqueue('qm-1', 9, { score: 3 }, 'p-3', null);
    enqueue('m-2', 3, { ownScore: 4 }, null, 'u1');

    expect(olvidaLasDe('qm-1', 'u1')).toBe(true);

    expect(getAll().map((e) => [e.matchId, e.holeNumber])).toEqual([['qm-1', 8], ['m-2', 3]]);
  });
});
