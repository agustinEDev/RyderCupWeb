import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('se pinta como decoracion cuando no lleva titulo', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('tiene nombre accesible cuando lleva titulo', () => {
    render(<BrandMark title="RyderCupFriends" />);
    const marca = screen.getByRole('img', { name: 'RyderCupFriends' });
    expect(marca).not.toHaveAttribute('aria-hidden');
  });

  it('es verde de marca sin que se lo pidan', () => {
    // Sin color en el valor por defecto heredaria el del contenedor, y saldria
    // gris o blanco sin que fallara nada
    const { container } = render(<BrandMark />);
    expect(container.querySelector('svg')).toHaveClass('text-primary-600');
  });

  it('toma el color de la utilidad de texto que le pasan', () => {
    const { container } = render(<BrandMark className="text-white" />);
    expect(container.querySelector('svg')).toHaveClass('text-white');
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});

/**
 * La marca vivia copiada a mano en once sitios (FE #464): quien retocaba el
 * color o el trazo cambiaba unas copias y se dejaba otras, y la discrepancia
 * solo salia en la pantalla que nadie abria. Nada impedia que volviera a pasar,
 * asi que la guardia es esta: el trazo esta en BrandMark.jsx y en ningun otro
 * sitio.
 *
 * Es una asercion sobre el fuente, como pageTitles.test.js, porque una copia
 * pegada en una pantalla que este test no renderiza no la ve ningun render.
 */
describe('el trazo de la marca no vuelve a duplicarse', () => {
  /** Por ruta exacta: un `endsWith` dejaria pasar un futuro `AuthBrandMark.jsx`
   *  con la copia dentro. */
  const PERMITIDOS = ['src/components/ui/BrandMark.jsx', 'src/components/ui/BrandMark.test.jsx'];

  /** `index.html`, `public/` y `vite.config.js` llevan marcado escrito a mano
   *  —la pantalla sin conexion, el manifiesto, el service worker— donde cabe un
   *  logo de arranque: si el guardia no los mira, una copia pegada ahi se queda
   *  verde y vuelve a divergir. */
  const RAICES = ['src', 'public'];
  const SUELTOS = ['index.html', 'vite.config.js'];

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

  it('solo BrandMark.jsx dibuja el triangulo', () => {
    const conElTrazo = [...RAICES.flatMap(listarFuentes), ...SUELTOS]
      .filter((ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8').includes('M13.8261 17.4264'))
      .filter((ruta) => !PERMITIDOS.includes(ruta));

    expect(conElTrazo).toEqual([]);
  });
});
