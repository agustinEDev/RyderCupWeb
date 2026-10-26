import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import InstallBanner from './InstallBanner';
import { VARIABLE_ALTO_AVISO_INSTALAR } from '../../utils/barraInferior';

/**
 * El aviso de instalar flota abajo y tapaba lo último de la página: en el
 * iPhone, «Cerrar sesión» del perfil (QA, FE #865-13). Publica su alto para
 * que el hueco del final cuente con él.
 *
 *   caso | qué                         | `--alto-aviso-instalar`
 *   -----|-----------------------------|------------------------
 *   A1   | se pinta                    | su alto
 *   A2   | cambia de alto (otra línea) | el nuevo
 *   A3   | se descarta                 | se quita
 *   A4   | se desmonta                 | se quita
 *   A5   | no se pinta                 | ni se pone
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es', changeLanguage: vi.fn() } }),
}));

const instalable = vi.hoisted(() => ({ si: true }));
vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: instalable.si,
    isIOS: false,
    isDesktopSafari: false,
    install: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

let alto;
let observadores;
const variable = () => document.documentElement.style.getPropertyValue(VARIABLE_ALTO_AVISO_INSTALAR);

beforeEach(() => {
  alto = 72;
  observadores = [];
  instalable.si = true;
  vi.spyOn(globalThis.HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => alto);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(fn) {
        this.fn = fn;
        this.desconectado = false;
        observadores.push(this);
      }
      observe(el) {
        this.observado = el;
      }
      disconnect() {
        this.desconectado = true;
      }
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty(VARIABLE_ALTO_AVISO_INSTALAR);
});

describe('InstallBanner · su hueco al final de la página', () => {
  it('A1: pintado, publica su alto', () => {
    render(<InstallBanner aboveBottomNav />);

    expect(variable()).toBe('72px');
  });

  it('A2: si cambia de alto, el nuevo', () => {
    const { getByTestId } = render(<InstallBanner />);
    expect(observadores.map((o) => o.observado)).toContain(getByTestId('install-banner'));

    alto = 96;
    act(() => observadores.forEach((o) => o.fn([])));

    expect(variable()).toBe('96px');
  });

  it('A3: descartado, se quita', () => {
    const { rerender } = render(<InstallBanner />);

    instalable.si = false;
    rerender(<InstallBanner />);

    expect(variable()).toBe('');
    expect(observadores.every((o) => o.desconectado)).toBe(true);
  });

  it('A4: desmontado, se quita', () => {
    const { unmount } = render(<InstallBanner />);

    unmount();

    expect(variable()).toBe('');
  });

  it('A5: sin aviso, ni se pone', () => {
    instalable.si = false;
    render(<InstallBanner />);

    expect(variable()).toBe('');
  });
});
