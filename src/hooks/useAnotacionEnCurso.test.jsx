import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, useNavigate } from 'react-router';

/**
 * Lo que las tres anotaciones apuntan para volver a ellas si iOS cierra la app, y lo que
 * reponen al cargar (11 nov 2026). Las pantallas no tocan el almacenamiento: dan su
 * estado y con qué cambiarlo, y el hook hace el resto.
 *
 *   H1 cargada, guarda cuenta, ruta, pestaña, hoyo y mapa (A1-A2)
 *   H2 antes de cargar no guarda: el hoyo 1 inicial no pisa el guardado
 *   H3 un cambio de pestaña, hoyo o mapa se guarda (A2)
 *   H4 al pasar a segundo plano renueva la hora (A3)
 *   H5 al salir de la anotación (desmontar) la olvida (A4)
 *   H6 terminada o entregada, la olvida y no guarda (A5)
 *   H7 al cargar repone la pestaña, el hoyo y, ya en ese hoyo, el mapa de ESTA anotación,
 *      en cualquier carga (no solo tras un arranque en frío)
 *   H8 una pestaña que no es de esta pantalla no se pone; el hoyo nunca pasa del último;
 *      el mapa no se abre si no se puede
 *   H9 lo guardado de otra anotación no se repone aquí
 *   H10 sin cuenta no guarda nada
 */
const ID = '0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d';
const RUTA = `/quick-matches/${ID}/scoring`;
const CLAVE = 'anotacion_en_curso';
let usuario = { id: 'u-anota' };

vi.mock('./useAuth', () => ({ useAuth: () => ({ user: usuario }) }));

const { useAnotacionEnCurso } = await import('./useAnotacionEnCurso');
const { guardaLaAnotacionEnCurso } = await import('../utils/anotacionEnCurso');

const memoria = () => {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
  };
};

const PESTANAS = ['input', 'classification', 'scorecard'];
const guardado = () => JSON.parse(localStorage.getItem(CLAVE));
const guarda = (extra = {}) =>
  guardaLaAnotacionEnCurso({ cuenta: 'u-anota', pathname: RUTA, search: '', pestana: 'input', hoyo: 12, mapa: false, ...extra });

/** Una pantalla de anotación de mentira: su pestaña, su hoyo y su mapa, como las de verdad. */
const usePantalla = ({ cargada = true, terminada = false, totalHoyos = 18, disponible = true, hoyoFijo = false, pestanaFija = false, mapaNoAbre = false } = {}) => {
  const [pestana, setPestana] = useState('input');
  const [hoyo, setHoyo] = useState(1);
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const mapa = { abierto, disponible, abrir: mapaNoAbre ? () => {} : () => setAbierto(true) };
  useAnotacionEnCurso({
    cargada,
    terminada,
    pestana,
    pestanas: PESTANAS,
    alCambiarDePestana: pestanaFija ? () => {} : setPestana,
    hoyo,
    totalHoyos,
    // `hoyoFijo`: una pantalla cuyo hoyo aún no ha cambiado (el estado llega en otro render)
    alCambiarDeHoyo: hoyoFijo ? () => {} : setHoyo,
    mapa,
  });
  return { pestana, setPestana, hoyo, setHoyo, abierto, setAbierto, navigate };
};

const monta = (props = {}, ruta = RUTA) =>
  renderHook((p) => usePantalla(p), {
    initialProps: props,
    wrapper: ({ children }) => <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>,
  });

describe('useAnotacionEnCurso', () => {
  beforeEach(() => {
    usuario = { id: 'u-anota' };
    vi.stubGlobal('localStorage', memoria());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('H1: cargada, guarda cuenta, ruta, pestaña, hoyo y mapa', () => {
    const { result } = monta();

    act(() => {
      result.current.setPestana('scorecard');
      result.current.setHoyo(4);
      result.current.setAbierto(true);
    });

    expect(guardado()).toMatchObject({ cuenta: 'u-anota', ruta: RUTA, pestana: 'scorecard', hoyo: 4, mapa: true });
  });

  it('H2: antes de cargar no guarda, y el guardado sigue con su hoyo', () => {
    guarda({ hoyo: 12 });

    monta({ cargada: false });

    expect(guardado().hoyo).toBe(12);
  });

  it('H2b: al reponer, mientras la pantalla no está en el hoyo guardado, no guarda el 1 inicial', () => {
    guarda({ hoyo: 12, pestana: 'classification' });
    const escrito = vi.spyOn(localStorage, 'setItem');

    monta({ hoyoFijo: true });

    expect(guardado()).toMatchObject({ hoyo: 12, pestana: 'classification' });
    expect(escrito).not.toHaveBeenCalled();
  });

  it('H2c: al reponer no se escribe nunca el hoyo 1 ni la pestaña inicial', () => {
    guarda({ hoyo: 12, pestana: 'classification', mapa: true });
    const escrito = vi.spyOn(localStorage, 'setItem');

    monta();

    const escritos = escrito.mock.calls.map(([, v]) => JSON.parse(v));
    expect(escritos.every((e) => e.hoyo === 12 && e.pestana === 'classification')).toBe(true);
    expect(escritos.every((e) => e.mapa === true)).toBe(true);
  });

  it('H2e: con el hoyo ya repuesto pero la pestaña aún no, no guarda la pestaña inicial', () => {
    guarda({ hoyo: 12, pestana: 'classification' });

    monta({ pestanaFija: true });

    expect(guardado()).toMatchObject({ hoyo: 12, pestana: 'classification' });
  });

  it('H2d: si el jugador cambia de hoyo antes de que se reponga, manda lo suyo y se guarda', () => {
    guarda({ hoyo: 12, mapa: true });
    const { result } = monta({ hoyoFijo: true });

    act(() => result.current.setHoyo(3));

    expect(guardado()).toMatchObject({ hoyo: 3, mapa: false });
    expect(result.current.abierto).toBe(false);
  });

  it('H2f: si el mapa no llega a abrirse, se sigue guardando al anotar', () => {
    guarda({ hoyo: 5, mapa: true });
    const { result } = monta({ mapaNoAbre: true });

    act(() => result.current.setHoyo(6));

    expect(guardado()).toMatchObject({ hoyo: 6, mapa: false });
  });

  it('H2g: si vuelve al hoyo del que partía antes de reponerse todo, se guarda lo suyo', () => {
    guarda({ hoyo: 7, pestana: 'classification' });
    const { result } = monta({ pestanaFija: true });

    act(() => result.current.setHoyo(1));

    expect(guardado()).toMatchObject({ hoyo: 1, pestana: 'input' });
  });

  it('H2h: al pasar a otra anotación sin desmontar, repone la de la otra', () => {
    const OTRA = '/quick-matches/1c6b7d2f-3e4a-4b6c-9d8e-0f1a2b3c4d5e/scoring';
    const { result } = monta();
    act(() => result.current.setHoyo(4));
    guardaLaAnotacionEnCurso({ cuenta: 'u-anota', pathname: OTRA, search: '', pestana: 'scorecard', hoyo: 15, mapa: false });

    act(() => result.current.navigate(OTRA));

    expect(result.current).toMatchObject({ hoyo: 15, pestana: 'scorecard' });
    expect(guardado()).toMatchObject({ ruta: OTRA, hoyo: 15, pestana: 'scorecard' });
  });

  it('H2i: con el mapa sin datos todavía, lo guardado sigue con el mapa y se abre al llegar', () => {
    guarda({ hoyo: 5, mapa: true });
    const { result, rerender } = monta({ disponible: false });
    expect(result.current).toMatchObject({ hoyo: 5, abierto: false });
    expect(guardado()).toMatchObject({ hoyo: 5, mapa: true });

    rerender({ disponible: true });

    expect(result.current.abierto).toBe(true);
    expect(guardado()).toMatchObject({ hoyo: 5, mapa: true });
  });

  it('H2j: con el mapa sin datos, si el jugador cambia de hoyo ya no se reabre', () => {
    guarda({ hoyo: 5, mapa: true });
    const { result, rerender } = monta({ disponible: false });

    act(() => result.current.setHoyo(6));
    rerender({ disponible: true });

    expect(result.current.abierto).toBe(false);
    expect(guardado()).toMatchObject({ hoyo: 6, mapa: false });
  });

  it('H5b: al salir no borra lo que otra pestaña guardó de otra anotación', () => {
    const { unmount } = monta();
    guardaLaAnotacionEnCurso({
      cuenta: 'u-anota',
      pathname: '/quick-matches/1c6b7d2f-3e4a-4b6c-9d8e-0f1a2b3c4d5e/scoring',
      search: '',
      pestana: 'input',
      hoyo: 3,
      mapa: false,
    });

    unmount();

    expect(guardado()).toMatchObject({ hoyo: 3 });
  });

  it('H2k: con el hoyo ya en el guardado y solo la pestaña por reponer, el mapa se abre', () => {
    guarda({ hoyo: 1, pestana: 'classification', mapa: true });

    const { result } = monta();

    expect(result.current).toMatchObject({ hoyo: 1, pestana: 'classification', abierto: true });
  });

  it('H3: un cambio de pestaña, hoyo o mapa se guarda', () => {
    const { result } = monta();

    act(() => result.current.setHoyo(7));
    expect(guardado().hoyo).toBe(7);
    act(() => result.current.setPestana('classification'));
    expect(guardado().pestana).toBe('classification');
    act(() => result.current.setAbierto(true));
    expect(guardado().mapa).toBe(true);
  });

  it('H4: al pasar a segundo plano renueva la hora', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T09:00:00Z'));
    monta();
    const antes = guardado().hora;

    vi.setSystemTime(new Date('2026-11-11T09:40:00Z'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new globalThis.Event('visibilitychange')));

    expect(guardado().hora - antes).toBe(40 * 60 * 1000);
  });

  it('H5: al salir de la anotación la olvida', () => {
    const { unmount } = monta();
    expect(guardado()).not.toBeNull();

    unmount();

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('H6: terminada o entregada, la olvida y no guarda', () => {
    const { rerender, result } = monta();

    rerender({ terminada: true });
    act(() => result.current.setHoyo(18));

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('H7: al cargar repone pestaña, hoyo y, ya en ese hoyo, el mapa', () => {
    guarda({ pestana: 'classification', hoyo: 12, mapa: true });

    const { result } = monta();

    expect(result.current).toMatchObject({ pestana: 'classification', hoyo: 12, abierto: true });
    expect(guardado()).toMatchObject({ pestana: 'classification', hoyo: 12, mapa: true });
  });

  it('H7: si aún no ha cargado, repone cuando carga', () => {
    guarda({ hoyo: 9 });
    const { result, rerender } = monta({ cargada: false });
    expect(result.current.hoyo).toBe(1);

    rerender({ cargada: true });

    expect(result.current.hoyo).toBe(9);
  });

  it('H8: una pestaña que no es de esta pantalla no se pone', () => {
    guarda({ pestana: 'leaderboard', hoyo: 5 });

    const { result } = monta();

    expect(result.current).toMatchObject({ pestana: 'input', hoyo: 5 });
  });

  it('H8: el hoyo nunca pasa del último de la partida', () => {
    guarda({ hoyo: 14 });

    const { result } = monta({ totalHoyos: 9 });

    expect(result.current.hoyo).toBe(9);
  });

  it('H8: el mapa no se abre si no se puede (campo de otro país)', () => {
    guarda({ hoyo: 6, mapa: true });

    const { result } = monta({ disponible: false });

    expect(result.current).toMatchObject({ hoyo: 6, abierto: false });
  });

  it('H8: terminada, no repone nada', () => {
    guarda({ hoyo: 6, pestana: 'scorecard' });

    const { result } = monta({ terminada: true });

    expect(result.current).toMatchObject({ pestana: 'input', hoyo: 1 });
  });

  it('H9: lo guardado de otra anotación no se repone aquí', () => {
    guardaLaAnotacionEnCurso({
      cuenta: 'u-anota',
      pathname: '/quick-matches/1c6b7d2f-3e4a-4b6c-9d8e-0f1a2b3c4d5e/scoring',
      search: '',
      pestana: 'classification',
      hoyo: 12,
      mapa: false,
    });

    const { result } = monta();

    expect(result.current).toMatchObject({ pestana: 'input', hoyo: 1, abierto: false });
  });

  it('H10: sin cuenta no guarda nada', () => {
    usuario = null;

    monta();

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
