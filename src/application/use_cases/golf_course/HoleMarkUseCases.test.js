import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SaveHoleMarkUseCase from './SaveHoleMarkUseCase';
import SendPendingHoleMarksUseCase from './SendPendingHoleMarksUseCase';
import GetMyHoleMarksUseCase from './GetMyHoleMarksUseCase';
import LocalStorageHoleMarkStore from '../../../infrastructure/repositories/LocalStorageHoleMarkStore';

const SALIDA = { lat: 36.28, lon: -5.33 };
const CODO = { lat: 36.2815, lon: -5.331 };
const GREEN = { lat: 36.2827, lon: -5.33 };
const AHORA = '2026-10-15T08:05:00.000Z';

const sinRed = () => Object.assign(new TypeError('sin conexión'), { cause: new TypeError('Failed to fetch') });
const http = (status, errorCode = null) => Object.assign(new Error(`HTTP ${status}`), { status, errorCode });

describe('marcas de hoyo — casos de uso (PR C)', () => {
  let guardado;
  let store;
  let repo;
  let reportarFallo;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    store = new LocalStorageHoleMarkStore();
    repo = {
      saveHoleMark: vi.fn(async (_id, holeNumber, marca) => ({ ...marca, holeNumber, markedAt: '2026-10-15T08:05:00Z' })),
      getMyHoleMarks: vi.fn(async () => []),
    };
    reportarFallo = vi.fn();
  });

  afterEach(() => vi.unstubAllGlobals());

  const guardar = (datos = {}) =>
    new SaveHoleMarkUseCase({ golfCourseRepository: repo, holeMarkStore: store, ahora: () => AHORA, reportarFallo }).execute({
      userId: 'u1',
      golfCourseId: 'gc-1',
      holeNumber: 3,
      tee: SALIDA,
      bends: [CODO],
      greenCenter: GREEN,
      ...datos,
    });

  describe('C12/C14: guardar con red', () => {
    it('C17: avisa en cuanto la marca está en el móvil, antes de enviarla', async () => {
      let enElMovilAlAvisar;
      const alGuardarEnElMovil = vi.fn(() => {
        enElMovilAlAvisar = store.load('u1', 'gc-1').marcas[3];
      });
      repo.saveHoleMark.mockImplementation(async () => {
        expect(alGuardarEnElMovil).toHaveBeenCalled();
        return { holeNumber: 3, tee: SALIDA, bends: [], greenCenter: GREEN, markedAt: 'x' };
      });

      await guardar({ alGuardarEnElMovil });

      expect(enElMovilAlAvisar.markedAt).toBe(AHORA);
    });

    it('una foto del servidor que llega después de guardar no borra la marca', async () => {
      let responder;
      repo.getMyHoleMarks.mockReturnValue(new Promise((r) => (responder = r)));
      const pedido = new GetMyHoleMarksUseCase({ golfCourseRepository: repo, holeMarkStore: store }).execute('u1', 'gc-1');
      await guardar();

      responder([]);
      const marcas = await pedido;

      expect(Object.keys(marcas)).toEqual(['3']);
    });

    it('se envía con la hora del jugador y queda la del servidor, ya no pendiente', async () => {
      const r = await guardar();

      expect(repo.saveHoleMark).toHaveBeenCalledWith('gc-1', 3, { holeNumber: 3, tee: SALIDA, bends: [CODO], greenCenter: GREEN, markedAt: AHORA });
      expect(r.estado).toBe('guardada');
      expect(store.load('u1', 'gc-1').marcas[3].markedAt).toBe('2026-10-15T08:05:00Z');
      expect(store.pendientes('u1')).toEqual([]);
    });

    it('una marca solo de green no lleva codos aunque se los pasen', async () => {
      await guardar({ tee: null });

      expect(repo.saveHoleMark.mock.calls[0][2]).toMatchObject({ tee: null, bends: [] });
    });

    it('si el servidor devuelve otra más reciente, queda esa', async () => {
      const masNueva = { holeNumber: 3, tee: SALIDA, bends: [], greenCenter: CODO, markedAt: '2026-10-15T09:00:00Z' };
      repo.saveHoleMark.mockResolvedValue(masNueva);

      const r = await guardar();

      expect(r.marca).toEqual(masNueva);
      expect(store.load('u1', 'gc-1').marcas[3]).toEqual(masNueva);
    });
  });

  describe('C17: guardar sin cobertura', () => {
    it.each([
      ['sin red', sinRed()],
      ['servidor caído', http(503)],
      ['tope de peticiones', http(429)],
      ['sesión', http(401)],
    ])('%s: se ve ya y queda pendiente', async (_caso, fallo) => {
      repo.saveHoleMark.mockRejectedValue(fallo);

      const r = await guardar();

      expect(r.estado).toBe('pendiente');
      expect(store.load('u1', 'gc-1').marcas[3].markedAt).toBe(AHORA);
      expect(store.pendientes('u1')).toHaveLength(1);
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('un fallo que no es de red ni HTTP se avisa (y la marca sigue pendiente)', async () => {
      repo.saveHoleMark.mockRejectedValue(new Error('respuesta rara'));

      expect((await guardar()).estado).toBe('pendiente');
      expect(reportarFallo).toHaveBeenCalledTimes(1);
    });
  });

  describe('el servidor no la quiere', () => {
    it.each([
      [409, 'HOLE_ALREADY_MAPPED'],
      [422, 'HOLE_MARK_OUT_OF_RANGE'],
      [422, 'TEE_REQUIRED'],
      [404, 'GOLF_COURSE_NOT_FOUND'],
    ])('%i %s: se descarta y se dice por qué', async (status, code) => {
      repo.saveHoleMark.mockRejectedValue(http(status, code));

      const r = await guardar();

      expect(r).toEqual({ estado: 'rechazada', marca: null, errorCode: code });
      expect(store.load('u1', 'gc-1')).toEqual({ marcas: {}, pendientes: {} });
    });
  });

  describe('C17/C18: vaciar las pendientes', () => {
    const pendiente = async (golfCourseId, holeNumber) => {
      repo.saveHoleMark.mockRejectedValueOnce(sinRed());
      await guardar({ golfCourseId, holeNumber });
    };
    const vaciado = () => new SendPendingHoleMarksUseCase({ golfCourseRepository: repo, holeMarkStore: store, reportarFallo });

    it('con red, salen todas las del jugador', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);

      const cuenta = await vaciado().execute('u1');

      expect(cuenta).toEqual({ enviadas: 2, rechazadas: 0, pendientes: 0 });
      expect(store.pendientes('u1')).toEqual([]);
    });

    it('D19: solo las de quien tiene la sesión', async () => {
      await pendiente('gc-1', 3);
      repo.saveHoleMark.mockRejectedValueOnce(sinRed());
      await new SaveHoleMarkUseCase({ golfCourseRepository: repo, holeMarkStore: store, ahora: () => AHORA }).execute({
        userId: 'u2', golfCourseId: 'gc-1', holeNumber: 3, tee: SALIDA, bends: [], greenCenter: GREEN,
      });
      repo.saveHoleMark.mockClear();

      await vaciado().execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(store.pendientes('u2')).toHaveLength(1);
    });

    it('sin red se para en la primera y no sigue intentando', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      repo.saveHoleMark.mockClear();
      repo.saveHoleMark.mockRejectedValue(sinRed());

      const cuenta = await vaciado().execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 0, rechazadas: 0, pendientes: 2 });
      expect(store.pendientes('u1')).toHaveLength(2);
    });

    it.each([
      ['el servidor caído (5xx)', http(503)],
      ['un CSRF caducado (FE #521: no se repite por marca)', Object.assign(new Error('csrf'), { errorCode: 'CSRF_VALIDATION_FAILED' })],
      ['el tope del refresco del token', Object.assign(new Error('tope'), { name: 'AbortError' })],
    ])('%s para la tanda, como la cola de golpes, y no se avisa como fallo nuestro', async (_caso, fallo) => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);
      repo.saveHoleMark.mockClear();
      reportarFallo.mockClear();
      repo.saveHoleMark.mockRejectedValue(fallo);

      const cuenta = await vaciado().execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 0, rechazadas: 0, pendientes: 2 });
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('un fallo nuestro (ni red ni servidor) se avisa, y sigue con las demás', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);
      repo.saveHoleMark.mockClear();
      reportarFallo.mockClear();
      repo.saveHoleMark.mockRejectedValueOnce(new RangeError('algo nuestro'));

      const cuenta = await vaciado().execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(2);
      expect(cuenta).toEqual({ enviadas: 1, rechazadas: 0, pendientes: 1 });
      expect(reportarFallo).toHaveBeenCalledTimes(1);
    });

    it('si la sesión cambió y volvió al mismo jugador, la tanda nueva va detrás de la que se corta', async () => {
      await pendiente('gc-1', 3);
      repo.saveHoleMark.mockClear();
      const uno = vaciado();
      // La de la sesión anterior, que ya no sigue
      const vieja = uno.execute('u1', { sigue: () => false });

      const nueva = uno.execute('u1', { sigue: () => true });
      await vieja;
      const cuenta = await nueva;

      expect(nueva).not.toBe(vieja);
      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(cuenta.enviadas).toBe(1);
      expect(store.pendientes('u1')).toEqual([]);
    });

    it('el tope de peticiones (429) para la tanda, como sin red', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      repo.saveHoleMark.mockClear();
      repo.saveHoleMark.mockRejectedValue(http(429));

      const cuenta = await vaciado().execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(cuenta.pendientes).toBe(2);
    });

    it('D19: si cambia la sesión a mitad, lo que queda no sale', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      repo.saveHoleMark.mockClear();
      let sesion = true;
      repo.saveHoleMark.mockImplementationOnce(async (_id, holeNumber, marca) => {
        sesion = false;
        return { ...marca, holeNumber };
      });

      const cuenta = await vaciado().execute('u1', { sigue: () => sesion });

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 1, rechazadas: 0, pendientes: 1 });
      expect(store.pendientes('u1')).toHaveLength(1);
    });

    it('la tanda en marcha es por jugador: la de otro no espera a la del primero', async () => {
      await pendiente('gc-1', 3);
      let soltar;
      repo.saveHoleMark.mockClear();
      repo.saveHoleMark.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const uno = vaciado();

      const deU1 = uno.execute('u1');
      const deU2 = await uno.execute('u2');

      expect(deU2).toEqual({ enviadas: 0, rechazadas: 0, pendientes: 0 });
      soltar({ holeNumber: 3, tee: null, bends: [], greenCenter: GREEN, markedAt: 'x' });
      await deU1;
    });

    it('una rechazada en segundo plano queda apuntada con su código', async () => {
      await pendiente('gc-1', 3);
      repo.saveHoleMark.mockRejectedValueOnce(http(422, 'HOLE_MARK_TOO_FAR_FROM_COURSE'));
      reportarFallo.mockClear();

      await vaciado().execute('u1');

      expect(reportarFallo).toHaveBeenCalledWith(expect.any(Error), {
        golfCourseId: 'gc-1',
        holeNumber: 3,
        errorCode: 'HOLE_MARK_TOO_FAR_FROM_COURSE',
      });
    });

    it('una rechazada se descarta y sigue con las demás', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      repo.saveHoleMark.mockRejectedValueOnce(http(409, 'HOLE_ALREADY_MAPPED'));

      const cuenta = await vaciado().execute('u1');

      expect(cuenta).toEqual({ enviadas: 1, rechazadas: 1, pendientes: 0 });
    });

    it('dos vaciados a la vez son uno solo', async () => {
      await pendiente('gc-1', 3);
      repo.saveHoleMark.mockClear();
      const uno = vaciado();

      await Promise.all([uno.execute('u1'), uno.execute('u1')]);

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
    });

    it('acabado un vaciado, el siguiente vuelve a mirar', async () => {
      const uno = vaciado();
      await uno.execute('u1');
      await pendiente('gc-1', 3);
      repo.saveHoleMark.mockClear();

      await uno.execute('u1');

      expect(repo.saveHoleMark).toHaveBeenCalledTimes(1);
    });
  });

  describe('C14/C16: las mías', () => {
    const mias = () => new GetMyHoleMarksUseCase({ golfCourseRepository: repo, holeMarkStore: store });

    it('las del servidor, por hoyo, y sin pisar lo pendiente', async () => {
      repo.saveHoleMark.mockRejectedValueOnce(sinRed());
      await guardar({ holeNumber: 3 });
      repo.getMyHoleMarks.mockResolvedValue([
        { holeNumber: 1, tee: SALIDA, bends: [], greenCenter: GREEN, markedAt: 'a' },
        { holeNumber: 3, tee: SALIDA, bends: [], greenCenter: CODO, markedAt: 'vieja' },
      ]);

      const marcas = await mias().execute('u1', 'gc-1');

      expect(Object.keys(marcas)).toEqual(['1', '3']);
      expect(marcas[3].markedAt).toBe(AHORA);
    });

    it('sin red, las del móvil', async () => {
      await guardar();
      repo.getMyHoleMarks.mockRejectedValue(sinRed());

      expect(Object.keys(await mias().execute('u1', 'gc-1'))).toEqual(['3']);
    });

    it('al momento, las del móvil sin pedir nada', async () => {
      await guardar();

      expect(Object.keys(mias().guardadas('u1', 'gc-1'))).toEqual(['3']);
      expect(repo.getMyHoleMarks).not.toHaveBeenCalled();
    });

    it('sin jugador o sin campo, nada', async () => {
      expect(await mias().execute(null, 'gc-1')).toEqual({});
      expect(await mias().execute('u1', null)).toEqual({});
      expect(repo.getMyHoleMarks).not.toHaveBeenCalled();
    });
  });
});
