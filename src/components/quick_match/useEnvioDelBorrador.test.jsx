import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnvioDelBorrador } from './useEnvioDelBorrador';

/**
 * «Confirmar e iniciar»:
 *
 *   #   caso                                                 | qué pasa
 *   ----|----------------------------------------------------|---------------------------------
 *   E1  bien                                               | onStarted con su id; sin aviso
 *   E2  4xx conocido                                       | aviso por su clave
 *   E3  sin red                                            | aviso de common
 *   E4  motivo del servidor / genérico                     | su texto / la clave genérica
 *   E5  reintento igual tras un 4xx                        | el mismo id
 *   E6  borrador cambiado tras un 4xx                      | id nuevo
 *   E7  borrador cambiado tras un fallo sin respuesta      | el mismo id y «ya se creó»
 *   E8  sin respuesta → 4xx → borrador cambiado             | la duda sigue: el mismo id y se dice
 *   E9  sin respuesta → sin red → bien                      | el mismo id las tres veces
 *   E10 sin respuesta → bien → borrador cambiado            | la duda acabó: id nuevo, sin aviso
 *   E11 creada, pero falla lo de después (onStarted)        | ya existe: otro borrador, el mismo id
 */
const mockCrear = vi.fn();
vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockCrear(...a) },
}));
const mockInfo = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { info: (...a) => mockInfo(...a) },
}));

const t = (clave) => clave;
const fallo = (status, message = 'x') =>
  Object.assign(new Error(message), { status });

const usaEnvio = (peticion) => {
  const ponElAviso = vi.fn();
  const onStarted = vi.fn();
  const armaLaPeticion = vi.fn(() => peticion.actual);
  const hook = renderHook(() =>
    useEnvioDelBorrador({
      armaLaPeticion,
      onStarted,
      t,
      ponElAviso,
    }),
  );
  return { ...hook, ponElAviso, onStarted };
};

const empieza = (result) =>
  act(async () => {
    await result.current.handleStart();
  });

describe('useEnvioDelBorrador', () => {
  beforeEach(() => {
    mockCrear.mockReset();
    mockInfo.mockReset();
  });

  it('E1: bien, avisa a quien abrió el asistente con el id', async () => {
    mockCrear.mockResolvedValue({ id: 'qm-1' });
    const peticion = { actual: { golfCourseId: 'gc-1' } };
    const { result, onStarted, ponElAviso } = usaEnvio(peticion);
    await empieza(result);
    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({
        golfCourseId: 'gc-1',
        quickMatchId: expect.any(String),
      }),
    );
    expect(onStarted).toHaveBeenCalledWith('qm-1');
    // Al empezar se quita el aviso que hubiera, y bien no pone otro
    expect(ponElAviso).toHaveBeenCalledTimes(1);
    expect(ponElAviso).toHaveBeenCalledWith(null);
    expect(mockInfo).not.toHaveBeenCalled();
    expect(result.current.isProcessing).toBe(false);
  });

  it.each([
    [403, 'create.errors.notFriends'],
    [404, 'create.errors.notFound'],
    [409, 'create.errors.conflict'],
    [422, 'create.errors.invalid'],
  ])('E2: un %i, por su clave', async (status, clave) => {
    mockCrear.mockRejectedValue(fallo(status));
    const { result, ponElAviso, onStarted } = usaEnvio({ actual: {} });
    await empieza(result);
    expect(ponElAviso).toHaveBeenCalledWith({ clave });
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('E3: sin red, el aviso de common', async () => {
    mockCrear.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result, ponElAviso } = usaEnvio({ actual: {} });
    await empieza(result);
    expect(ponElAviso).toHaveBeenCalledWith({
      clave: 'sinConexion.mensaje',
      comun: true,
    });
  });

  it('E4: el motivo del servidor como texto; un 500, genérico', async () => {
    mockCrear.mockRejectedValueOnce(fallo(400, 'El campo está cerrado'));
    const { result, ponElAviso } = usaEnvio({ actual: {} });
    await empieza(result);
    expect(ponElAviso).toHaveBeenLastCalledWith({
      texto: 'El campo está cerrado',
    });
    mockCrear.mockRejectedValueOnce(fallo(500, 'Internal Server Error'));
    await empieza(result);
    expect(ponElAviso).toHaveBeenLastCalledWith({
      clave: 'create.errors.generic',
    });
  });

  it('E5/E6: tras un 4xx, lo mismo reusa el id y otro borrador estrena', async () => {
    mockCrear.mockRejectedValue(fallo(409));
    const peticion = { actual: { name: 'A' } };
    const { result } = usaEnvio(peticion);
    await empieza(result);
    await empieza(result);
    const [primero, segundo] = mockCrear.mock.calls.map(
      ([p]) => p.quickMatchId,
    );
    expect(segundo).toBe(primero);
    peticion.actual = { name: 'B' };
    await empieza(result);
    expect(mockCrear.mock.calls[2][0].quickMatchId).not.toBe(primero);
  });

  it('E7: tras un fallo sin respuesta, otro borrador lleva el mismo id y se dice', async () => {
    mockCrear.mockRejectedValueOnce(fallo(503));
    const peticion = { actual: { name: 'A' } };
    const { result, onStarted } = usaEnvio(peticion);
    await empieza(result);
    peticion.actual = { name: 'B' };
    mockCrear.mockResolvedValueOnce({ id: 'qm-1' });
    await empieza(result);
    expect(mockCrear.mock.calls[1][0].quickMatchId).toBe(
      mockCrear.mock.calls[0][0].quickMatchId,
    );
    expect(mockInfo).toHaveBeenCalledWith('create.alreadyCreated');
    expect(onStarted).toHaveBeenCalledWith('qm-1');
  });

  const idsMandados = () => mockCrear.mock.calls.map(([p]) => p.quickMatchId);

  it('E8: un rechazo claro tras un fallo sin respuesta no quita la duda', async () => {
    // El primero pudo crearse: un 4xx después no dice nada de aquel
    mockCrear
      .mockRejectedValueOnce(fallo(503))
      .mockRejectedValueOnce(fallo(422))
      .mockResolvedValueOnce({ id: 'qm-1' });
    const peticion = { actual: { name: 'A' } };
    const { result, onStarted } = usaEnvio(peticion);
    await empieza(result);
    await empieza(result);
    peticion.actual = { name: 'B' };
    await empieza(result);
    const [primero, segundo, tercero] = idsMandados();
    expect(segundo).toBe(primero);
    expect(tercero).toBe(primero);
    expect(mockInfo).toHaveBeenCalledWith('create.alreadyCreated');
    expect(onStarted).toHaveBeenCalledWith('qm-1');
  });

  it('E9: sin respuesta, luego sin red y luego bien, siempre el mismo id', async () => {
    mockCrear
      .mockRejectedValueOnce(fallo(503))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ id: 'qm-1' });
    const { result, onStarted } = usaEnvio({ actual: { name: 'A' } });
    await empieza(result);
    await empieza(result);
    await empieza(result);
    expect(new Set(idsMandados()).size).toBe(1);
    expect(mockInfo).not.toHaveBeenCalled();
    expect(onStarted).toHaveBeenCalledWith('qm-1');
  });

  it('E10: tras salir bien, la duda acaba y otro borrador estrena id', async () => {
    mockCrear
      .mockRejectedValueOnce(fallo(503))
      .mockResolvedValueOnce({ id: 'qm-1' })
      .mockResolvedValueOnce({ id: 'qm-2' });
    const peticion = { actual: { name: 'A' } };
    const { result } = usaEnvio(peticion);
    await empieza(result);
    await empieza(result);
    peticion.actual = { name: 'B' };
    await empieza(result);
    const [primero, segundo, tercero] = idsMandados();
    expect(segundo).toBe(primero);
    expect(tercero).not.toBe(primero);
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it('E11: si falla lo de después de crearla, el reintento no crea otra', async () => {
    mockCrear.mockResolvedValue({ id: 'qm-1' });
    const onStarted = vi.fn().mockImplementationOnce(() => {
      throw new Error('al navegar');
    });
    const peticion = { actual: { name: 'A' } };
    const { result } = renderHook(() =>
      useEnvioDelBorrador({
        armaLaPeticion: () => peticion.actual,
        onStarted,
        t,
        ponElAviso: vi.fn(),
      }),
    );
    await empieza(result);
    peticion.actual = { name: 'B' };
    await empieza(result);
    const [primero, segundo] = idsMandados();
    expect(segundo).toBe(primero);
    expect(onStarted).toHaveBeenLastCalledWith('qm-1');
  });

  it('si armar la petición lanza, es un fallo más y no se manda nada', async () => {
    // Un TypeError (leer el id de un campo que no hay) cuenta como sin red,
    // igual que antes de sacar la petición a su función
    const ponElAviso = vi.fn();
    const { result } = renderHook(() =>
      useEnvioDelBorrador({
        armaLaPeticion: () => {
          throw new TypeError("Cannot read properties of null (reading 'id')");
        },
        onStarted: vi.fn(),
        t,
        ponElAviso,
      }),
    );
    await empieza(result);
    expect(ponElAviso).toHaveBeenCalledWith({
      clave: 'sinConexion.mensaje',
      comun: true,
    });
    expect(mockCrear).not.toHaveBeenCalled();
    expect(result.current.isProcessing).toBe(false);
  });
});
