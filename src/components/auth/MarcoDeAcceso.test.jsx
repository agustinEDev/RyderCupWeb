import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El marco de las pantallas de acceso, que estaba copiado cinco veces. Cada
 * prop reproduce una de las diferencias que había entre las copias.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
// Con qué entra cada caja: se deja a la vista
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, initial, animate, transition, ...resto }) => (
          <div
            data-motion={JSON.stringify({ initial, animate, transition })}
            {...resto}
          >
            {children}
          </div>
        ),
    },
  ),
}));

const { default: MarcoDeAcceso } = await import('./MarcoDeAcceso');

const VENTAJAS = [
  { icon: '🏆', text: 'Torneos' },
  { icon: '⛳', text: 'Estadísticas' },
];

const abrir = (props = {}) =>
  render(
    <MemoryRouter>
      <MarcoDeAcceso titulo="Hola" subtitulo="Entra" {...props}>
        <div data-testid="tarjeta">la tarjeta</div>
      </MarcoDeAcceso>
    </MemoryRouter>,
  );

const movimiento = (el) =>
  JSON.parse(el.closest('[data-motion]').getAttribute('data-motion'));
const panel = (container) => container.querySelector('.lg\\:w-1\\/2');
const siglasDelPanel = (container) => within(panel(container)).getByText('RCF');
const ladoDelFormulario = () =>
  screen.getByTestId('tarjeta').closest('[data-motion]');

describe('MarcoDeAcceso', () => {
  it('M1: el héroe lleva el título, el subtítulo y el pie', () => {
    const { container } = abrir();
    const heroe = within(panel(container));
    expect(heroe.getByRole('heading', { level: 2 }).textContent).toBe('Hola');
    expect(heroe.getByText('Entra')).toBeTruthy();
    expect(heroe.getByText('common:footer.copyrightShort')).toBeTruthy();
  });

  it('M2: las ventajas, cada una con su icono y con retardo creciente', () => {
    abrir({ ventajas: VENTAJAS });
    const torneos = screen.getByText('Torneos');
    const estadisticas = screen.getByText('Estadísticas');
    expect(torneos.previousSibling.textContent).toBe('🏆');
    expect(movimiento(torneos).transition).toEqual({ delay: 0.2 });
    expect(movimiento(estadisticas).transition.delay).toBeCloseTo(0.3);
  });

  it('M3: sin ventajas no pinta la lista', () => {
    const { container } = abrir();
    expect(container.querySelector('.space-y-4.mt-8')).toBeNull();
  });

  it('M4: el extra del héroe va tras la lista, dentro del bloque central', () => {
    abrir({
      ventajas: VENTAJAS,
      extraDelHeroe: <div data-testid="cifras">3 cifras</div>,
    });
    const cifras = screen.getByTestId('cifras');
    expect(cifras.parentElement.className).toBe('space-y-6');
    expect(cifras.previousSibling.className).toBe('space-y-4 mt-8');
  });

  it('M5: el logo del móvil, a la portada y solo fuera de pantalla grande', () => {
    abrir();
    const logos = screen.getAllByRole('link', { name: /RyderCupFriends/ });
    expect(logos).toHaveLength(2);
    const movil = logos.find((a) => a.className.includes('lg:hidden'));
    expect(movil.getAttribute('href')).toBe('/');
    expect(within(movil).getByText('RCF').className).toContain('text-primary');
  });

  it('M6: «Volver» con su texto, a la portada, tras la tarjeta', () => {
    abrir({ textoDeVolver: 'Volver al inicio' });
    const volver = screen.getByText('Volver al inicio').closest('a');
    expect(volver.getAttribute('href')).toBe('/');
    expect(volver.querySelector('svg')).toBeTruthy();
    expect(screen.getByTestId('tarjeta').nextSibling).toBe(volver);
  });

  it('M7: sin texto de volver no hay enlace tras la tarjeta', () => {
    abrir();
    expect(screen.getByTestId('tarjeta').nextSibling).toBeNull();
  });

  it('M8: la variante primaria, verde con las siglas en acento y la foto de siempre', () => {
    const { container } = abrir();
    expect(panel(container).className).toContain('bg-primary');
    expect(container.querySelector('.bg-accent.rounded-full').className).toBe(
      'absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl',
    );
    expect(siglasDelPanel(container).className).toContain('text-accent');
    expect(container.querySelector('.bg-cover').style.backgroundImage).toBe(
      'url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000")',
    );
  });

  it('M9: la variante del Registro, en acento con las manchas en espejo y su foto', () => {
    const { container } = abrir({ variante: 'acento', foto: 'https://x/y' });
    expect(panel(container).className).toContain('bg-accent');
    expect(panel(container).className).not.toContain('bg-primary');
    expect(container.querySelector('.bg-white.rounded-full').className).toBe(
      'absolute top-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl',
    );
    expect(container.querySelector('.bg-primary.rounded-full').className).toBe(
      'absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl',
    );
    expect(siglasDelPanel(container).className).toContain('text-white/90');
    expect(container.querySelector('.bg-cover').style.backgroundImage).toBe(
      'url("https://x/y")',
    );
  });

  it('M10: el panel entra desde la izquierda y el formulario sube', () => {
    const { container } = abrir();
    expect(movimiento(panel(container))).toEqual({
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.6 },
    });
    expect(movimiento(ladoDelFormulario())).toEqual({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5 },
    });
  });

  it('M11: con soloAparece el formulario no se desplaza (FE #865-12)', () => {
    abrir({ soloAparece: true });
    expect(movimiento(ladoDelFormulario())).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.5 },
    });
  });
});
