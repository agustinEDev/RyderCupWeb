import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Por donde arranca la aplicacion instalada (FE #465). Lo que se prueba es lo
 * unico que decide: a donde manda a cada uno.
 *
 * Existe para que `/` deje de hacer dos papeles. Antes habia que adivinar, por
 * el tipo de navegacion, si una visita a la portada era un arranque, y eso fallo
 * dos veces: al entrar por un enlace compartido y luego pulsar el logo, y al
 * volver atras desde el panel.
 */
const estado = { instalada: true, comprobando: false, textosListos: true };

vi.mock('../hooks/useStandalone', () => ({
  useStandalone: () => estado.instalada,
  // La cortina del arranque tambien la usa, y solo se sostiene con la
  // aplicacion instalada
  detectStandalone: () => estado.instalada,
}));

vi.mock('../hooks/useRedirectIfAuthenticated', () => ({
  useRedirectIfAuthenticated: () => estado.comprobando,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: estado.textosListos }),
}));

vi.mock('../components/auth/SignInForm', () => ({
  default: () => <div data-testid="formulario-de-acceso" />,
}));

const { esperaElAviso, reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const AppStart = (await import('./AppStart')).default;

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<AppStart />} />
        <Route path="/" element={<div>PORTADA</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('AppStart', () => {
  beforeEach(() => {
    estado.instalada = true;
    estado.comprobando = false;
    estado.textosListos = true;
  });

  it('instalada y sin sesion, enseña el acceso', () => {
    pintar();
    expect(screen.getByTestId('formulario-de-acceso')).toBeInTheDocument();
    expect(screen.queryByText('PORTADA')).not.toBeInTheDocument();
  });

  it('en el navegador manda a la portada', () => {
    // La ruta puede alcanzarse por un enlace copiado o tras desinstalar: en el
    // navegador la puerta es la portada
    estado.instalada = false;
    pintar();
    expect(screen.getByText('PORTADA')).toBeInTheDocument();
  });

  it('mientras resuelve la sesion no enseña el formulario', () => {
    // Apareceria entero para desaparecer un segundo despues
    estado.comprobando = true;
    pintar();
    expect(screen.queryByTestId('formulario-de-acceso')).not.toBeInTheDocument();
  });

  it('deja una salida hacia la portada', () => {
    pintar();
    const salida = screen.getByText('appStart.whatIsThis');
    expect(salida.closest('a')).toHaveAttribute('href', '/');
  });
});

/**
 * El aviso a la cortina del arranque (FE #485). Esta pantalla es una de las dos
 * salidas del arranque: la cortina verde no se levanta hasta que la de destino
 * dice que ha terminado.
 */
describe('AppStart y la cortina del arranque', () => {
  const sigueLaCortina = () => Boolean(document.getElementById('arranque'));

  beforeEach(() => {
    estado.instalada = true;
    estado.comprobando = false;
    estado.textosListos = true;
    reiniciaLaCortina();
    // La cortina pide las dos cosas: aplicacion instalada y la capa pintandose
    // de verde por el CSS
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    document.body.innerHTML = '<div id="arranque"></div>';
    // La ruta `/start` avisa: al llegar, la cortina se queda esperando
    esperaElAviso();
  });

  // El plazo de la cortina es un `setTimeout` de verdad sobre el modulo: sin
  // esto, el ultimo test del bloque lo deja vivo y salta sobre lo que venga
  // despues en el mismo worker
  afterEach(() => {
    reiniciaLaCortina();
  });

  it('mientras se resuelve la sesion, la cortina se queda', () => {
    estado.comprobando = true;

    pintar();

    expect(sigueLaCortina()).toBe(true);
  });

  it('con el formulario ya en pantalla, se levanta', () => {
    pintar();

    expect(sigueLaCortina()).toBe(false);
  });

  it('sin los textos todavia, la cortina se queda', () => {
    // Los trozos de i18n llegan en diferido: sin ellos se lee «appStart.title»
    // en crudo y el texto cambia un instante despues
    estado.textosListos = false;

    pintar();

    expect(sigueLaCortina()).toBe(true);
  });
});

/**
 * El mock de i18n devuelve la clave, asi que los tests de arriba pasarian aunque
 * la traduccion no existiera — que es EXACTAMENTE el fallo que este mismo trabajo
 * corrige en el panel, donde se leyo `recentMatches.excludedBadge` en crudo en
 * produccion. Esto ata las claves de esta pantalla a los dos idiomas.
 */
describe('los textos de la pantalla existen en los dos idiomas', () => {
  it('appStart.title y appStart.whatIsThis', async () => {
    const es = (await import('../i18n/locales/es/auth.json')).default;
    const en = (await import('../i18n/locales/en/auth.json')).default;

    for (const clave of ['title', 'whatIsThis']) {
      // Que exista no basta: si el valor fuera la propia clave, `toBeTruthy`
      // pasaria y en pantalla se leeria «appStart.title»
      expect(es.appStart?.[clave], `falta en es: ${clave}`).toBeTruthy();
      expect(es.appStart?.[clave]).not.toContain('appStart.');
      expect(en.appStart?.[clave], `falta en en: ${clave}`).toBeTruthy();
      expect(en.appStart?.[clave]).not.toContain('appStart.');
    }
  });
});
