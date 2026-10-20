import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mientras se va a la pantalla de aceptar los Términos, las pantallas que
 * pierden su llamada no enseñan su error: la página se está yendo (revisión,
 * punto 2). Pasado ese momento, los errores vuelven a verse.
 */
const custom = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { custom: (...a) => custom(...a), dismiss: vi.fn() } }));

const { default: customToast } = await import('./toast');
const { llevaAAceptarLosTerminos, olvidaLaRedireccionATerminos } = await import('./terminosPendientes');

describe('customToast · silencio mientras se va a aceptar los Términos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.sessionStorage.clear();
    olvidaLaRedireccionATerminos();
    vi.stubGlobal('location', { pathname: '/dashboard', search: '', hash: '', origin: 'http://localhost', assign: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sin redirección en marcha, los errores se ven', () => {
    customToast.error('algo falló');

    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('yéndose a aceptar los Términos, los errores no se enseñan', () => {
    llevaAAceptarLosTerminos();

    customToast.error('algo falló');

    expect(custom).not.toHaveBeenCalled();
  });

  it('pasado el plazo, vuelven a verse', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    llevaAAceptarLosTerminos();
    vi.setSystemTime(Date.now() + 60_000);

    customToast.error('algo falló');

    expect(custom).toHaveBeenCalledTimes(1);
  });
});
