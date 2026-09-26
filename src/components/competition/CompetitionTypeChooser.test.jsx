import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

const CompetitionTypeChooser = (await import('./CompetitionTypeChooser')).default;

/**
 * LA TABLA de la FE #639 — la competición se elige por tipo antes de rellenar
 * nada. Hoy solo existe la Ryder Cup; Stableford y Medal se enseñan para que se
 * vea hacia dónde va la aplicación (RyderCupAm#251), y tienen que leerse como
 * lo que son: todavía no.
 *
 *   #   caso                                   | qué pasa
 *   ----|----------------------------------------|---------------------------
 *   1   se pinta                                 | los TRES tipos, no solo el vivo
 *   2   pulsar Ryder Cup                         | se elige y sigue el formulario
 *   3   pulsar uno de los que vienen             | NADA
 *   4   con teclado sobre uno de los que vienen  | tampoco: ni foco ni Enter
 *   5   «próximamente»                           | visible SIEMPRE, sin pasar el ratón
 *
 * El 3 y el 4 son el motivo de este fichero: un botón que se puede pulsar y no
 * hace nada es peor que no tenerlo, y en el móvil no hay ratón que valga.
 */
describe('CompetitionTypeChooser', () => {
  let alElegir;

  beforeEach(() => {
    alElegir = vi.fn();
  });

  const pinta = () => render(<CompetitionTypeChooser onSelect={alElegir} />);

  it('1: enseña los tres tipos, no solo el que funciona', () => {
    pinta();

    expect(screen.getByTestId('tipo-RYDER_CUP')).toBeInTheDocument();
    expect(screen.getByTestId('tipo-STABLEFORD')).toBeInTheDocument();
    expect(screen.getByTestId('tipo-MEDAL')).toBeInTheDocument();
  });

  it('2: la Ryder Cup se elige', () => {
    pinta();

    fireEvent.click(screen.getByTestId('tipo-RYDER_CUP'));

    expect(alElegir).toHaveBeenCalledWith('RYDER_CUP');
  });

  it('3: los que aún no están no hacen nada al pulsarlos', () => {
    pinta();

    fireEvent.click(screen.getByTestId('tipo-STABLEFORD'));
    fireEvent.click(screen.getByTestId('tipo-MEDAL'));

    expect(alElegir).not.toHaveBeenCalled();
  });

  it('4: y tampoco con el teclado, que es por donde se cuelan', () => {
    pinta();

    const stableford = screen.getByTestId('tipo-STABLEFORD');
    // Fuera del recorrido del tabulador y anunciado como deshabilitado
    expect(stableford).toHaveAttribute('aria-disabled', 'true');
    expect(stableford).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(stableford, { key: 'Enter' });
    fireEvent.keyDown(stableford, { key: ' ' });

    expect(alElegir).not.toHaveBeenCalled();
  });

  it('5: «próximamente» se lee sin pasar el ratón por encima', () => {
    // En un móvil no hay hover: si la etiqueta viviera en un tooltip, el jugador
    // vería dos tipos que parecen disponibles y no lo están.
    //
    // Se mira la CLASE, no `toBeVisible()`: jsdom no aplica el CSS de Tailwind,
    // así que esconder la etiqueta tras un `group-hover` pasaba el test tan
    // campante. Lo comprobé mutándolo, y por eso este test dice lo que dice
    pinta();

    const avisos = screen.getAllByText('create.type.comingSoon');
    expect(avisos).toHaveLength(2);
    avisos.forEach((aviso) => {
      expect(aviso).toBeVisible();
      expect(aviso.className).not.toMatch(/hover:/);
      expect(aviso.className).not.toMatch(/\bhidden\b/);
    });
  });

  it('5b: los que vienen se leen: atenuados no es descoloridos (CodeRabbit)', () => {
    // `opacity-50` sobre la tarjeta entera apaga también el texto y la propia
    // etiqueta. Tienen que verse como no disponibles y leerse igual: al sol, en
    // un teléfono, un gris sobre gris no se lee
    pinta();

    const stableford = screen.getByTestId('tipo-STABLEFORD');
    expect(stableford.className).not.toMatch(/opacity-/);
  });

  it('6: cada tipo dice en una línea qué es', () => {
    pinta();

    expect(screen.getByText('create.type.RYDER_CUP.title')).toBeInTheDocument();
    expect(screen.getByText('create.type.RYDER_CUP.blurb')).toBeInTheDocument();
    expect(screen.getByText('create.type.STABLEFORD.blurb')).toBeInTheDocument();
    expect(screen.getByText('create.type.MEDAL.blurb')).toBeInTheDocument();
  });

  it('7: la tarjeta entera es la zona que se toca, no un botón dentro', () => {
    // En el móvil las tarjetas van a ancho completo: el objetivo táctil es la
    // tarjeta. Un botón pequeño dentro es lo que hace fallar el dedo
    pinta();

    const ryder = screen.getByTestId('tipo-RYDER_CUP');
    expect(ryder.tagName).toBe('BUTTON');
    expect(ryder.querySelector('button')).toBeNull();
  });

  it('8: el que se puede elegir está en el recorrido del tabulador', () => {
    pinta();

    expect(screen.getByTestId('tipo-RYDER_CUP')).not.toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('tipo-RYDER_CUP')).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('CompetitionTypeChooser · las tarjetas alineadas (FE #710)', () => {
  it('el contenido de todas empieza arriba: la de «próximamente» es más alta', () => {
    // Un botón centra su contenido en vertical: las bajas quedaban centradas y
    // la alta arriba, y los iconos no se alineaban
    render(<CompetitionTypeChooser onSelect={vi.fn()} />);

    for (const id of ['RYDER_CUP', 'STABLEFORD', 'MEDAL']) {
      const clases = screen.getByTestId(`tipo-${id}`).className;
      expect(clases).toContain('flex-col');
      expect(clases).toContain('justify-start');
    }
  });
});
