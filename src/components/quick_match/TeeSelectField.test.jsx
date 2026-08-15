import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeeSelectField from './TeeSelectField';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => options?.defaultValue ?? key,
    i18n: { language: 'es' },
  }),
}));

// Golf de Meis: las amarillas están valoradas por separado para cada género, y
// la diferencia entre una y otra son varios golpes de hándicap de juego. Es el
// caso que provocó el fallo original, así que es el que se prueba.
const meisTees = [
  { color: 'YELLOW', gender: 'MALE', identifier: null, courseRating: 73.1, slopeRating: 140 },
  { color: 'YELLOW', gender: 'FEMALE', identifier: null, courseRating: 79.4, slopeRating: 147 },
  { color: 'WHITE', gender: 'MALE', identifier: null, courseRating: 74.0, slopeRating: 142 },
];

const renderField = (props = {}) =>
  render(
    <TeeSelectField
      value=""
      onChange={() => {}}
      courseTees={meisTees}
      label="Tus barras"
      placeholder="Elige tus barras"
      playerName="tus barras"
      testIdPrefix="quick-match-creator-tee"
      {...props}
    />
  );

describe('TeeSelectField', () => {
  it('muestra el marcador de posición cuando no hay salida elegida', () => {
    renderField();

    expect(screen.getByTestId('quick-match-creator-tee')).toHaveTextContent('Elige tus barras');
    expect(screen.queryByTestId('quick-match-tee-panel')).not.toBeInTheDocument();
  });

  it('abre el panel agrupado por género al pulsar', () => {
    renderField();

    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));

    expect(screen.getByTestId('quick-match-tee-panel')).toBeInTheDocument();
    // Las dos amarillas aparecen como opciones distintas, cada una en su grupo
    expect(screen.getByTestId('quick-match-tee-panel-option-YELLOW|MALE')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-tee-panel-option-YELLOW|FEMALE')).toBeInTheDocument();
  });

  it('separa las salidas por género con su encabezado', () => {
    renderField();

    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));

    // Es lo que evita confundir "Amarillas (M)" con "Amarillas (F)": ya no van
    // pegadas en una fila, van bajo encabezados distintos
    expect(screen.getByText('create.teePanel.male')).toBeInTheDocument();
    expect(screen.getByText('create.teePanel.female')).toBeInTheDocument();
  });

  it('devuelve la clave elegida y cierra el panel', () => {
    const onChange = vi.fn();
    renderField({ onChange });

    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-YELLOW|FEMALE'));

    expect(onChange).toHaveBeenCalledWith('YELLOW|FEMALE');
    expect(screen.queryByTestId('quick-match-tee-panel')).not.toBeInTheDocument();
  });

  it('enseña la salida elegida con su género', () => {
    renderField({ value: 'YELLOW|FEMALE' });

    // El sufijo (F) es lo único que distingue esta salida de la masculina, así
    // que tiene que verse sin abrir el panel
    expect(screen.getByTestId('quick-match-creator-tee')).toHaveTextContent('(F)');
  });

  it('marca en el panel la salida que ya está puesta', () => {
    renderField({ value: 'YELLOW|FEMALE' });

    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));

    expect(screen.getByTestId('quick-match-tee-panel-option-YELLOW|FEMALE')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('quick-match-tee-panel-option-YELLOW|MALE')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('no marca nada si la salida guardada ya no está en el campo', () => {
    renderField({ value: 'BLUE|MALE' });

    expect(screen.getByTestId('quick-match-creator-tee')).toHaveTextContent('Elige tus barras');
  });
});
