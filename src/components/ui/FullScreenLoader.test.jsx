import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Este componente es tambien el fallback del `Suspense` raiz, donde se pinta
 * antes de que baje el namespace `common`: ahi `t()` no resuelve y manda el
 * respaldo. Por eso el mock devuelve el `defaultValue` en vez de la clave.
 */
const estadoI18n = { language: 'es', resolvedLanguage: 'es' };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_clave, opciones) => opciones?.defaultValue ?? _clave,
    i18n: estadoI18n,
  }),
}));

const { terminaElArranque, reiniciaLaCortina } = await import('../../utils/cortinaDeArranque');
const FullScreenLoader = (await import('./FullScreenLoader')).default;

describe('FullScreenLoader', () => {
  beforeEach(() => {
    estadoI18n.language = 'es';
    estadoI18n.resolvedLanguage = 'es';
    reiniciaLaCortina();
  });

  it('espera en español mientras el namespace no ha bajado', () => {
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('espera en ingles cuando ese es el idioma activo', () => {
    estadoI18n.resolvedLanguage = 'en';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('acepta la etiqueta con region', () => {
    estadoI18n.resolvedLanguage = 'es-ES';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('acepta la etiqueta con region en su forma con guion bajo', () => {
    // `es_ES` es la forma que ya hizo estallar `localeCompare` en este proyecto
    estadoI18n.resolvedLanguage = 'es_ES';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('cae en ingles ante una etiqueta heredada de Object', () => {
    // `i18nextLng` es texto libre: en un objeto, `constructor` habria devuelto
    // una funcion y React no sabe pintarla —pantalla en blanco al arrancar—
    estadoI18n.resolvedLanguage = 'constructor';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('cae en ingles ante una etiqueta que no reconoce', () => {
    // El idioma sale de `i18nextLng`, que no pasa por ninguna lista cerrada
    estadoI18n.resolvedLanguage = 'zz';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});

/**
 * Las dos caras de la espera (FE #492). El verde de la marca es la pantalla con
 * la que la aplicacion se abre: volver a verlo al pulsar «Inicio» en la barra
 * inferior se lee como si la aplicacion se reiniciara, cuando eso es una simple
 * transicion. Dentro de la aplicacion se pinta la cara sobria, la misma que en
 * el navegador.
 */
describe('las dos caras de la espera', () => {
  const monograma = () => document.querySelector('img[src*="monogram"]');

  beforeEach(() => {
    estadoI18n.language = 'es';
    estadoI18n.resolvedLanguage = 'es';
    reiniciaLaCortina();
  });

  it('durante el arranque va sin marcar: el CSS la pinta de verde', () => {
    render(<FullScreenLoader />);

    expect(screen.getByRole('status')).not.toHaveClass('pantalla-de-espera--transicion');
    expect(screen.getByRole('status')).toHaveClass('pantalla-de-espera');
  });

  it('durante el arranque el monograma lo elige la media query', () => {
    // `<source media="(display-mode: standalone)">`: blanco instalada, verde en
    // el navegador. Sobre el verde del arranque hace falta el blanco
    render(<FullScreenLoader />);

    // Sin encadenar opcionales: `expect(undefined).not.toBeNull()` pasa, y este
    // test se quedaria en verde sin monograma ninguno
    const img = monograma();
    expect(img).not.toBeNull();
    const fuente = img.closest('picture')?.querySelector('source');
    expect(fuente).not.toBeNull();
    expect(fuente.getAttribute('media')).toContain('display-mode: standalone');
    expect(fuente.getAttribute('srcset')).toContain('white');
  });

  it('terminado el arranque se marca como transicion', () => {
    terminaElArranque();

    render(<FullScreenLoader />);

    expect(screen.getByRole('status')).toHaveClass('pantalla-de-espera--transicion');
  });

  it('en la transicion el monograma va VERDE a la fuerza', () => {
    // Con la aplicacion instalada, `auto` lo pintaria blanco, y sobre el fondo
    // claro de esta cara el monograma desapareceria
    terminaElArranque();

    render(<FullScreenLoader />);

    const img = monograma();
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toContain('green');
    expect(img.closest('picture')).toBeNull();
  });
});

/**
 * La cara se decide al MONTAR, no en cada render. La bandera vive en un modulo
 * y cambia sola, y este componente se vuelve a pintar sin desmontarse
 * —react-i18next lo fuerza al bajar el namespace `common`, que va perezoso—:
 * leerla en el render hacia que una espera EN CURSO pasara de verde a blanco
 * delante de los ojos. Un parpadeo nuevo, en la saga de los parpadeos.
 */
describe('la cara no cambia a media espera', () => {
  beforeEach(() => {
    estadoI18n.language = 'es';
    estadoI18n.resolvedLanguage = 'es';
    reiniciaLaCortina();
  });

  it('la espera que empezo como arranque sigue siendo arranque', () => {
    const { rerender } = render(<FullScreenLoader />);
    const antes = screen.getByRole('status');
    expect(antes).not.toHaveClass('pantalla-de-espera--transicion');

    // El arranque termina mientras esta espera sigue en pantalla
    terminaElArranque();
    rerender(<FullScreenLoader />);

    // El MISMO nodo, y con la misma cara
    expect(screen.getByRole('status')).toBe(antes);
    expect(screen.getByRole('status')).not.toHaveClass('pantalla-de-espera--transicion');
  });
});
