import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useState } from 'react';

// Las claves con sus parámetros: así se ve qué número llega a cada texto
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const StrokePlaySettings = (await import('./StrokePlaySettings')).default;
const { formularioDeAjustes, IGUALES } = await import('../../utils/ajustesDeStrokePlay');

/**
 * La sección de ajustes de un Stableford o un Medal (FE #824). Casos de la
 * tabla de la PR 2 (10 oct 2026):
 *
 *   #    caso                                   | qué pasa
 *   -----|----------------------------------------|-------------------------------
 *   4    por defecto                             | límites a mano, ninguno: una categoría
 *   5    añadir límites                          | hasta 4; con 4 no se ofrece más
 *   6    vista previa con 12,0 y 26,0            | tres categorías con sus rangos
 *   7    un límite que no vale                   | su error junto a la sección
 *   8    categorías iguales                      | de 2 a 5, y cómo se reparten
 *   9    cambiar de modo                         | lo del otro modo se conserva
 *   10   regla de los seis                       | se avisa en los dos modos
 *   11   jornadas                                | de 1 a los días del torneo
 *   13   general                                 | acumulado o mejor tarjeta, explicado por tipo
 */
const Con = ({ inicial = formularioDeAjustes(null), tipo = 'STABLEFORD', dias = 3, espia }) => {
  const [valor, setValor] = useState(inicial);
  return (
    <StrokePlaySettings
      valor={valor}
      tipo={tipo}
      dias={dias}
      onCambio={(nuevo) => {
        espia?.(nuevo);
        setValor(nuevo);
      }}
    />
  );
};

describe('StrokePlaySettings (FE #824)', () => {
  it('4: por defecto, límites a mano sin ninguno: una sola categoría', () => {
    render(<Con />);

    expect(screen.getByTestId('modo-LIMITES')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('modo-IGUALES')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryAllByLabelText(/create.strokePlay.limitLabel/)).toHaveLength(0);
    expect(screen.getByText('create.strokePlay.preview.single')).toBeInTheDocument();
  });

  it('5: se añaden hasta 4 límites y con 4 ya no se ofrece otro', () => {
    render(<Con />);

    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'create.strokePlay.addLimit' }));
    }

    expect(screen.getAllByLabelText(/create.strokePlay.limitLabel/)).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'create.strokePlay.addLimit' })).toBeNull();
  });

  it('5b: un límite se quita con su botón', () => {
    render(<Con inicial={formularioDeAjustes({ categoryLimits: [12, 26], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' })} />);

    fireEvent.click(screen.getByRole('button', { name: 'create.strokePlay.removeLimit {"numero":2}' }));

    const quedan = screen.getAllByLabelText(/create.strokePlay.limitLabel/);
    expect(quedan).toHaveLength(1);
    expect(quedan[0]).toHaveValue('12,0');
  });

  it('6: la vista previa con 12,0 y 26,0 enseña tres categorías', () => {
    render(<Con inicial={formularioDeAjustes({ categoryLimits: [12, 26], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' })} />);

    const vista = within(screen.getByTestId('vista-previa'));
    expect(vista.getByText('create.strokePlay.preview.upTo {"numero":1,"hasta":"12,0"}')).toBeInTheDocument();
    expect(vista.getByText('create.strokePlay.preview.between {"numero":2,"desde":"12,1","hasta":"26,0"}')).toBeInTheDocument();
    expect(vista.getByText('create.strokePlay.preview.above {"numero":3,"masDe":"26,0"}')).toBeInTheDocument();
  });

  it('7: unos límites desordenados dicen por qué y no enseñan una vista previa engañosa', () => {
    render(<Con inicial={formularioDeAjustes({ categoryLimits: [26, 12], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('create.errors.categoryLimitsOrder');
    expect(screen.queryByTestId('vista-previa')).toBeNull();
  });

  it('7c: un límite recién añadido, aún vacío, no es un error que anunciar (revisor)', () => {
    render(<Con />);

    fireEvent.click(screen.getByRole('button', { name: 'create.strokePlay.addLimit' }));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('7d: el campo que falla se marca y apunta a su error', () => {
    render(<Con inicial={{ ...formularioDeAjustes(null), limites: ['12,0', '60'] }} />);

    const [bueno, malo] = screen.getAllByLabelText(/create.strokePlay.limitLabel/);
    expect(malo).toHaveAttribute('aria-invalid', 'true');
    expect(malo).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
    expect(bueno).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('7e: un límite vacío no tapa el error de las jornadas (/code-review)', () => {
    render(<Con dias={2} inicial={{ ...formularioDeAjustes(null), limites: [''], jornadas: '5' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('create.errors.matchdaysMoreThanDays {"count":2}');
  });

  it('7f: y un error de las categorías tampoco', () => {
    render(<Con dias={2} inicial={{ ...formularioDeAjustes(null), limites: ['60'], jornadas: '5' }} />);

    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'create.errors.categoryLimitRange',
      'create.errors.matchdaysMoreThanDays {"count":2}',
    ]);
  });

  it('7b: lo que se escribe en un límite llega tal cual', () => {
    const espia = vi.fn();
    render(<Con espia={espia} />);
    fireEvent.click(screen.getByRole('button', { name: 'create.strokePlay.addLimit' }));

    fireEvent.change(screen.getByLabelText(/create.strokePlay.limitLabel/), { target: { value: '12,5' } });

    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ limites: ['12,5'] }));
  });

  it('8: en categorías iguales se elige de 2 a 5 y se explica cómo se reparten', () => {
    const espia = vi.fn();
    render(<Con espia={espia} />);

    fireEvent.click(screen.getByTestId('modo-IGUALES'));

    const selector = screen.getByLabelText('create.strokePlay.equalCount');
    expect([...selector.options].map((o) => o.value)).toEqual(['2', '3', '4', '5']);
    expect(screen.getByText('create.strokePlay.equalHint')).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: '4' } });
    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ modo: IGUALES, categoriasIguales: '4' }));
  });

  it('9: al volver a límites a mano siguen los que había escritos', () => {
    render(<Con inicial={formularioDeAjustes({ categoryLimits: [12], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' })} />);

    fireEvent.click(screen.getByTestId('modo-IGUALES'));
    expect(screen.queryAllByLabelText(/create.strokePlay.limitLabel/)).toHaveLength(0);
    fireEvent.click(screen.getByTestId('modo-LIMITES'));

    expect(screen.getByLabelText(/create.strokePlay.limitLabel/)).toHaveValue('12,0');
  });

  it.each(['LIMITES', 'IGUALES'])('10: la regla de los seis se avisa en %s', (modo) => {
    render(<Con />);

    fireEvent.click(screen.getByTestId(`modo-${modo}`));

    expect(screen.getByText('create.strokePlay.sixRule')).toBeInTheDocument();
  });

  it('11: las jornadas van de 1 a los días del torneo', () => {
    const espia = vi.fn();
    render(<Con dias={3} espia={espia} />);

    const jornadas = screen.getByLabelText('create.strokePlay.matchdays');
    expect(jornadas).toHaveAttribute('min', '1');
    expect(jornadas).toHaveAttribute('max', '3');
    fireEvent.change(jornadas, { target: { value: '2' } });
    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ jornadas: '2' }));
  });

  it('11b: más jornadas que días dice cuántas caben', () => {
    render(<Con dias={2} inicial={{ ...formularioDeAjustes(null), jornadas: '3' }} />);

    // Con `count`: i18next pone el plural («1 día», «2 días») (revisor)
    expect(screen.getByRole('alert')).toHaveTextContent('create.errors.matchdaysMoreThanDays {"count":2}');
  });

  it.each([
    ['STABLEFORD', 'create.strokePlay.overall.ACCUMULATED.STABLEFORD'],
    ['MEDAL', 'create.strokePlay.overall.ACCUMULATED.MEDAL'],
  ])('13: el acumulado se explica según el tipo (%s)', (tipo, explicacion) => {
    render(<Con tipo={tipo} />);

    expect(screen.getByText(explicacion)).toBeInTheDocument();
    expect(screen.getByText('create.strokePlay.overall.BEST_CARD.hint')).toBeInTheDocument();
  });

  it('13b: se elige la mejor tarjeta', () => {
    const espia = vi.fn();
    render(<Con espia={espia} />);

    fireEvent.click(screen.getByLabelText('create.strokePlay.overall.BEST_CARD.label'));

    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ general: 'BEST_CARD' }));
  });
});
