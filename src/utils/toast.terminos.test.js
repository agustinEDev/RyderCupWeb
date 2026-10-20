import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Revisión (punto 5): mientras se va a la pantalla de aceptar los Términos, solo
 * se calla el aviso del error de Términos —el de la llamada cortada, que no dice
 * nada útil—. Cualquier otro error se sigue viendo.
 */
const custom = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { custom: (...a) => custom(...a), dismiss: vi.fn() } }));

const { default: customToast } = await import('./toast');
const { llevaAAceptarLosTerminos, olvidaLaRedireccionATerminos, silenciaElAviso } = await import('./terminosPendientes');

describe('customToast · solo se calla el aviso de Términos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.sessionStorage.clear();
    olvidaLaRedireccionATerminos();
    vi.stubGlobal('location', { pathname: '/dashboard', search: '', hash: '', origin: 'http://localhost', assign: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('el aviso marcado de Términos no se enseña', () => {
    llevaAAceptarLosTerminos();
    silenciaElAviso('Tienes que aceptar los Términos');

    customToast.error('Tienes que aceptar los Términos');

    expect(custom).not.toHaveBeenCalled();
  });

  it('un error ajeno se enseña aunque haya una redirección en curso', () => {
    llevaAAceptarLosTerminos();
    silenciaElAviso('Tienes que aceptar los Términos');

    customToast.error('No se ha podido guardar el golpe');

    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('sin redirección, los errores se ven', () => {
    customToast.error('algo falló');

    expect(custom).toHaveBeenCalledTimes(1);
  });
});
