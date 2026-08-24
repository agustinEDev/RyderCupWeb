import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('se pinta como decoracion cuando no lleva titulo', () => {
    const { container } = render(<BrandMark />);
    const marca = container.querySelector('img');
    expect(marca).toHaveAttribute('aria-hidden', 'true');
    expect(marca).toHaveAttribute('alt', '');
  });

  it('tiene nombre accesible cuando lleva titulo', () => {
    render(<BrandMark title="RyderCupFriends" />);
    const marca = screen.getByAltText('RyderCupFriends');
    expect(marca).not.toHaveAttribute('aria-hidden');
  });

  it('es la tinta verde por defecto', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('img').getAttribute('src')).toContain('green');
  });

  it('pinta la tinta blanca cuando se la piden', () => {
    const { container } = render(<BrandMark tinta="blanco" />);
    expect(container.querySelector('img').getAttribute('src')).toContain('white');
  });

  it('cae en la tinta verde ante una tinta que no existe', () => {
    const { container } = render(<BrandMark tinta="turquesa" />);
    expect(container.querySelector('img').getAttribute('src')).toContain('green');
  });
});

/**
 * La marca vivia copiada a mano en trece sitios (FE #464): quien retocaba el
 * color o la imagen cambiaba unas copias y se dejaba otras, y la discrepancia
 * solo salia en la pantalla que nadie abria. Durante un tiempo llegaron a
 * convivir DOS marcas distintas —el triangulo en el pie y en las pantallas de
 * autenticacion, el monograma en las cabeceras—, que es como se descubrio.
 *
 * Es una asercion sobre el fuente, como pageTitles.test.js, porque una copia
 * pegada en una pantalla que este test no renderiza no la ve ningun render.
 */
describe('la marca no vuelve a duplicarse', () => {
  const PERMITIDOS = ['src/components/ui/BrandMark.jsx', 'src/components/ui/BrandMark.test.jsx'];

  /** `index.html`, `public/` y `vite.config.js` llevan marcado escrito a mano
   *  —la pantalla sin conexion, el manifiesto, el service worker— donde cabe un
   *  logo de arranque: si el guardia no los mira, una copia pegada ahi se queda
   *  verde y vuelve a divergir. */
  const RAICES = ['src', 'public'];
  const SUELTOS = ['index.html', 'vite.config.js'];

  /** Cualquier forma de nombrar los ficheros de marca. El trazo del triangulo
   *  se vigila tambien: si reaparece, es que alguien volvio a pegarlo. */
  const RASTROS = [/rcf-monogram/, /rcf-logo/, /M13\.8261 17\.4264/];

  const listarFuentes = (dir) => {
    const salida = [];
    for (const entrada of readdirSync(resolve(process.cwd(), dir))) {
      const ruta = join(dir, entrada);
      if (statSync(resolve(process.cwd(), ruta)).isDirectory()) {
        salida.push(...listarFuentes(ruta));
      } else if (/\.(jsx?|tsx?|html|svg|css)$/.test(entrada)) {
        salida.push(ruta);
      }
    }
    return salida;
  };

  it('solo BrandMark.jsx nombra la marca', () => {
    const conLaMarca = [...RAICES.flatMap(listarFuentes), ...SUELTOS]
      .filter((ruta) => {
        const texto = readFileSync(resolve(process.cwd(), ruta), 'utf8');
        return RASTROS.some((r) => r.test(texto));
      })
      .filter((ruta) => !PERMITIDOS.includes(ruta) && ruta !== 'index.html');

    expect(conLaMarca).toEqual([]);
  });
});

/**
 * `index.html` es el unico sitio donde la marca vive fuera del componente: la
 * espera del arranque se pinta ANTES de que exista React. No se le da via libre
 * al fichero entero —eso apagaria el guardia justo ahi— sino a las dos
 * referencias que necesita el `<picture>`.
 */
describe('la marca en index.html', () => {
  const ESPERADAS = ['/images/rcf-monogram-white.png', '/images/rcf-monogram-green.png'];

  it('solo estan las dos referencias de la espera del arranque', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    // Sin deduplicar: una tercera copia que repita una ruta —un `og:image`
    // apuntando al mismo PNG— se colaba si se agrupaban
    const encontradas = html.match(/[\w./-]*rcf-monogram[\w-]*\.\w+/g) || [];

    expect(encontradas.sort()).toEqual([...ESPERADAS].sort());
  });

  it('el trazo del triangulo tampoco puede colarse ahi', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).not.toMatch(/M13\.8261 17\.4264/);
    expect(html).not.toMatch(/rcf-logo/);
  });
});
