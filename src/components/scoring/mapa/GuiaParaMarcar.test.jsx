import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GuiaParaMarcar from './GuiaParaMarcar';

const t = (k) => k;
const abrir = () => {
  const onCerrar = vi.fn();
  render(<GuiaParaMarcar t={t} abierta onCerrar={onCerrar} />);
  return { onCerrar, dialogo: screen.getByRole('dialog') };
};

describe('GuiaParaMarcar', () => {
  it('G2: el título, la intro, los tres pasos con su dibujo, el pie y «Empezar»', () => {
    const { dialogo } = abrir();
    const en = within(dialogo);

    expect(en.getByRole('heading', { name: 'mapa.guia.titulo' })).toBeTruthy();
    for (const clave of [
      'intro',
      'salidaTitulo',
      'salidaTexto',
      'greenTitulo',
      'greenTexto',
      'curvaTitulo',
      'curvaTexto',
      'pie',
    ])
      expect(en.getByText(`mapa.guia.${clave}`)).toBeTruthy();
    const pasos = en.getAllByRole('listitem');
    expect(pasos).toHaveLength(3);
    // Un dibujo por paso, en SVG dentro (sin imágenes de fuera) y mudo
    for (const paso of pasos) {
      const dibujos = paso.querySelectorAll('svg');
      expect(dibujos).toHaveLength(1);
      expect(dibujos[0].getAttribute('aria-hidden')).toBe('true');
    }
    expect(dialogo.querySelector('img')).toBeNull();
    expect(en.getByRole('button', { name: 'mapa.guia.empezar' })).toBeTruthy();
  });

  it('B2: es un diálogo modal con su título enlazado, y el foco entra', () => {
    const { dialogo } = abrir();

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    const titulo = document.getElementById(
      dialogo.getAttribute('aria-labelledby'),
    );
    expect(titulo).toHaveTextContent('mapa.guia.titulo');
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it.each([
    ['«Empezar»', () => fireEvent.click(screen.getByText('mapa.guia.empezar'))],
    [
      'la X',
      () =>
        fireEvent.click(screen.getByRole('button', { name: 'mapa.cerrar' })),
    ],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('G3: se cierra con %s', (_caso, cerrar) => {
    const { onCerrar } = abrir();

    cerrar();

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('G3: tocar fuera no la cierra (solo «Empezar», la X o Escape)', () => {
    const { onCerrar, dialogo } = abrir();

    fireEvent.mouseDown(dialogo);
    fireEvent.click(dialogo);

    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('cerrada, no pinta nada', () => {
    render(<GuiaParaMarcar t={t} abierta={false} onCerrar={vi.fn()} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('G5: si no cabe en alto, se desplaza dentro de la guía; a lo ancho, cabe', () => {
    const { dialogo } = abrir();
    const caja = dialogo.firstElementChild;

    expect(caja.className).toMatch(/overflow-y-auto/);
    expect(caja.className).toMatch(/max-h-/);
    expect(caja.className).toMatch(/w-full/);
    expect(caja.className).not.toMatch(/overflow-x-(auto|scroll)/);
  });
});
