import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El refresco del hándicap al entrar (FE #677), lanzado sin esperarlo.
 *
 * Lo lanza el login y no el panel: el login devuelve a la página que se pidió,
 * que no siempre es el panel, y el refresco tiene que ocurrir igual. Nadie lo
 * espera —ni el login ni ninguna pantalla—, así que una RFEG caída no retiene
 * nada. El panel solo recoge el resultado para abrir el modal.
 */

const refresco = vi.fn();
vi.mock('../composition', () => ({
  refreshOwnHandicapUseCase: { execute: (...args) => refresco(...args) },
}));

const consulta = vi.fn();
vi.mock('./sesionCompartida', () => ({
  consultaLaSesion: (...args) => consulta(...args),
}));

const guardado = {};
globalThis.localStorage = {
  getItem: (clave) => guardado[clave] ?? null,
  setItem: (clave, valor) => {
    guardado[clave] = String(valor);
  },
  removeItem: (clave) => {
    delete guardado[clave];
  },
  clear: () => {
    for (const clave of Object.keys(guardado)) delete guardado[clave];
  },
};

const {
  lanzaElRefrescoDeHandicap,
  recogeElHandicapPorPedir,
  EVENTO_HANDICAP_POR_PEDIR,
  reiniciaElRefrescoDeHandicap,
} = await import('./refrescoDeHandicap');
const { olvidaElRefrescoDeHandicap } = await import('./refrescoDeHandicapApuntes');

describe('refrescoDeHandicap (FE #677)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    reiniciaElRefrescoDeHandicap();
    localStorage.setItem('refrescar_handicap', 'true');
  });

  it('F1: si hace falta pedirlo, lo deja para el panel y avisa', async () => {
    refresco.mockResolvedValue({ needsHandicap: true, handicap: 18 });
    const aviso = vi.fn();
    window.addEventListener(EVENTO_HANDICAP_POR_PEDIR, aviso);

    await lanzaElRefrescoDeHandicap({ handicapDeAntes: 18 });

    window.removeEventListener(EVENTO_HANDICAP_POR_PEDIR, aviso);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(recogeElHandicapPorPedir()).toBe(18);
    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
  });

  it('F2: con el mismo hándicap no recarga la sesión', async () => {
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 12.4 });

    await lanzaElRefrescoDeHandicap({ handicapDeAntes: 12.4 });

    expect(consulta).not.toHaveBeenCalled();
    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
  });

  it('F3: si cambió, recarga la sesión para que toda la app lo vea', async () => {
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 11.8 });

    await lanzaElRefrescoDeHandicap({ handicapDeAntes: 12.4 });

    expect(consulta).toHaveBeenCalledWith({ forzar: true });
  });

  it('F4: lanzado dos veces con uno en vuelo, sale una sola petición', async () => {
    let responder;
    refresco.mockReturnValue(new Promise((resolver) => { responder = resolver; }));

    const primera = lanzaElRefrescoDeHandicap();
    const segunda = lanzaElRefrescoDeHandicap();
    responder({ needsHandicap: false, handicap: null });
    await Promise.all([primera, segunda]);

    expect(refresco).toHaveBeenCalledTimes(1);
  });

  it('F5: un 4xx no se arregla solo: se borra el apunte', async () => {
    refresco.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    await lanzaElRefrescoDeHandicap();

    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
  });

  it.each([
    ['sin respuesta', new Error('Failed to fetch')],
    ['un 5xx', Object.assign(new Error('Service Unavailable'), { status: 503 })],
  ])('F6: %s no afirma nada: el apunte se queda para reintentar', async (_, error) => {
    refresco.mockRejectedValue(error);

    await lanzaElRefrescoDeHandicap();

    expect(localStorage.getItem('refrescar_handicap')).toBe('true');
    expect(recogeElHandicapPorPedir()).toBeUndefined();
  });

  it('F7: lo pendiente se recoge una sola vez', async () => {
    refresco.mockResolvedValue({ needsHandicap: true, handicap: null });
    await lanzaElRefrescoDeHandicap();

    expect(recogeElHandicapPorPedir()).toBeNull();
    expect(recogeElHandicapPorPedir()).toBeUndefined();
  });

  it('F8: tras terminar, se puede volver a lanzar', async () => {
    refresco.mockResolvedValue({ needsHandicap: false, handicap: null });

    await lanzaElRefrescoDeHandicap();
    await lanzaElRefrescoDeHandicap();

    expect(refresco).toHaveBeenCalledTimes(2);
  });

  it('F9: un refresco que dice que no hace falta borra lo que quedara pendiente de antes', async () => {
    // Si no, el modal saldría días después con un valor viejo
    localStorage.setItem('pedir_handicap', JSON.stringify({ handicap: 18 }));
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 12.4 });

    await lanzaElRefrescoDeHandicap({ handicapDeAntes: 12.4 });

    expect(recogeElHandicapPorPedir()).toBeUndefined();
  });

  it('F10: al salir se olvida todo lo del hándicap de esa cuenta', () => {
    localStorage.setItem('pedir_handicap', JSON.stringify({ handicap: 18 }));

    olvidaElRefrescoDeHandicap();

    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
    expect(localStorage.getItem('pedir_handicap')).toBeNull();
  });

  it('F11: la respuesta de una cuenta que ya salió no toca nada de la siguiente', async () => {
    // Dispositivo compartido con la RFEG lenta: A entra, sale y B entra antes
    // de que conteste lo de A. Esa respuesta no puede dejarle a B el modal con
    // el hándicap de A, ni borrarle a B su apunte
    let responderA;
    refresco.mockReturnValueOnce(new Promise((resolver) => { responderA = resolver; }));
    const deA = lanzaElRefrescoDeHandicap({ handicapDeAntes: 18 });

    olvidaElRefrescoDeHandicap();
    localStorage.setItem('refrescar_handicap', 'true');
    let responderB;
    refresco.mockReturnValueOnce(new Promise((resolver) => { responderB = resolver; }));
    const deB = lanzaElRefrescoDeHandicap({ handicapDeAntes: 9 });

    responderA({ needsHandicap: true, handicap: 18 });
    await deA;

    expect(refresco).toHaveBeenCalledTimes(2);
    expect(recogeElHandicapPorPedir()).toBeUndefined();
    expect(localStorage.getItem('refrescar_handicap')).toBe('true');
    // Y al terminar, la de A no suelta el candado de la de B
    lanzaElRefrescoDeHandicap({ handicapDeAntes: 9 });
    expect(refresco).toHaveBeenCalledTimes(2);

    responderB({ needsHandicap: false, handicap: 9 });
    await deB;
    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
  });

  it('F12: tampoco un 4xx de la cuenta que salió borra el apunte de la siguiente', async () => {
    let fallarA;
    refresco.mockReturnValueOnce(new Promise((_, rechazar) => { fallarA = rechazar; }));
    const deA = lanzaElRefrescoDeHandicap();

    olvidaElRefrescoDeHandicap();
    localStorage.setItem('refrescar_handicap', 'true');
    fallarA(Object.assign(new Error('Not Found'), { status: 404 }));
    await deA;

    expect(localStorage.getItem('refrescar_handicap')).toBe('true');
  });
});
